/**
 * @author Md Hasibuzzaman
 * @email hasib.9437.hu@gmail.com
 * @create date 2023/05/31 10:13:48
 * @modify date 2023/05/31 10:13:48
 * @desc [description]
 */
import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildUpdateWithWhereSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../../../utils/file.util";
import { minioPresignedGet, uploadObject } from "../../../../../../utils/minio.util";
import { SamityMigrationServices } from "../../samity-migration.service";

@Service()
export class GetManualSamityApplicationData {
  constructor() {}

  async getMigrationApplicationById(samityId: any, doptorId: number, serviceId: number) {
    try {
      const sql = `SELECT id,samity_id,next_app_designation_id,status,data,edit_enable FROM COOP.APPLICATION WHERE SAMITY_ID = $1
      AND DOPTOR_ID = $2
      AND SERVICE_ID = $3
      AND STATUS IN ($4, $5)`;

      let result = (
        await (await pgConnect.getConnection("slave")).query(sql, [samityId, doptorId, serviceId, "P", "C"])
      ).rows[0];
      result = result ? toCamelKeys(result) : {};
      if (result?.data?.documentInfo != undefined) {
        for (const [index, element] of result.data.documentInfo.entries()) {
          if (element.documentName[0].fileName) {
            let fileName = await minioPresignedGet(element.documentName[0], ["fileName"]);
            result.data.documentInfo[index] = {
              ...(element.id && { id: element.id }),
              document_id: element.documentId,
              document_no: element.documentNo,
              document_nameUrl: fileName.fileNameUrl,
              document_name: fileName.fileName,
              document_type: element.documentId,
            };
          }
        }
      }
      return result ? result : {};
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
    let result = [];
    const updatedAt = new Date();
    const data = reqBody.data;
    data.userType = user.type;
    data.userId = user.type == "user" ? user.userId : user.userId;
    //add column to samityInfo
    const samityMigrationServices = Container.get(SamityMigrationServices);
    const {
      samityDivisionNameBangla,
      samityDistrictNameBangla,
      samityUpaCityNameBangla,
      samityUniThanaPawNameBangla,
      samityTypeName,
      enterPrisingNameBangla,
      projectNameBangla,
    } = await samityMigrationServices.requiredSamityInfoData(
      data.samityInfo.samityDivisionId,
      data.samityInfo.samityDistrictId,
      data.samityInfo.samityUpaCityId ? data.samityInfo.samityUpaCityId : 2753,
      data.samityInfo.samityUniThanaPawId,
      data.samityInfo.samityTypeId,
      data.samityInfo.enterprisingId,
      data.samityInfo.projectId
    );

    data.samityInfo = {
      ...data.samityInfo,
      officeId: user.officeId,
      organizerId: user.userId,
      doptorId: user.doptorId,
      samityDivisionNameBangla,
      samityDistrictNameBangla,
      samityUpaCityNameBangla,
      samityUniThanaPawNameBangla,
      samityTypeName,
      enterPrisingNameBangla,
      projectNameBangla,
    };

    //add column to member Area
    for (const [index, element] of data.memberArea.entries()) {
      const { divisionNameBangla, districtNameBangla, upaCityNameBangla, uniThanaPawNameBangla } =
        await samityMigrationServices.requiredAreaData(
          element.divisionId,
          element.districtId ? element.districtId : 0,
          element.upaCityId ? element.upaCityId : 0,
          element.uniThanaPawId ? element.uniThanaPawId : 0
        );
      data.memberArea[index] = {
        ...element,
        divisionNameBangla,
        districtNameBangla,
        upaCityNameBangla,
        uniThanaPawNameBangla,
      };
    }

    // add column to working Area
    for (const [index, element] of data.workingArea.entries()) {
      const { divisionNameBangla, districtNameBangla, upaCityNameBangla, uniThanaPawNameBangla } =
        await samityMigrationServices.requiredAreaData(
          element.divisionId,
          element.districtId ? element.districtId : 0,
          element.upaCityId ? element.upaCityId : 0,
          element.uniThanaPawId ? element.uniThanaPawId : 0
        );
      data.workingArea[index] = {
        ...element,
        divisionNameBangla,
        districtNameBangla,
        upaCityNameBangla,
        uniThanaPawNameBangla,
      };
    }
    for (const element of data.documentInfo) {
      let attachment = [];
      for (let elementDocumentName of element.documentName) {
        if (elementDocumentName.mimeType) {
          let bufferObj = Buffer.from(elementDocumentName.base64Image, "base64");
          const fileName = getFileName(elementDocumentName.name);
          await uploadObject({ fileName, buffer: bufferObj });
          attachment.push({ fileName, isCreate: true });
        } else {
          attachment.push({ fileName: elementDocumentName.name, isCreate: false });
        }
      }
      element.documentName = attachment;
    }

    const { sql, params } = buildUpdateWithWhereSql(
      "coop.application",
      {
        id,
      },
      { data: reqBody.data, status: "P", updatedBy, updatedAt }
    );
    result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
    return result;
  }
}
