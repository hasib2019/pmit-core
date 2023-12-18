import { toCamelKeys } from "keys-transform";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import DataService from "../../../modules/master/services/master-data.service";
import ZoneService from "../../../modules/master/services/zone.service";
import SamityService from "../../../modules/samity/services/samity.service";
import { emptyPaginationResponse, getPaginationDetails } from "../../../utils/pagination.util";

@Service()
export default class SamityReportService {
  constructor() {}

  async getSamity(
    userId: any,
    officeId: any,
    doptorId: any,
    districtId: any,
    upazilaID: any,
    projectId: any,
    flag: any,
    value: any
  ): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, samity_name FROM samity.samity_info 
                WHERE doptor_id = $1 AND office_id = $2 AND district_id = $3 AND upazila_id = $4 AND project_id = $5 AND flag = $6`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, districtId, upazilaID, projectId, flag]);
    } else if (value == 2) {
      sql = `SELECT data::json->'basic'->'samity_name' as samity_name, id FROM temps.staging_area
                WHERE user_id = $1 AND doptor_id = $2 AND district_id = $3 AND upazila_id = $4 AND project_id = $5`;
      samityInfo = await await pool.query(sql, [userId, doptorId, districtId, upazilaID, projectId]);
    }
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }

  async getSamityName(officeId: any, doptorId: any, projectId: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    sql = `SELECT id, samity_name FROM samity.samity_info WHERE doptor_id = $1 AND office_id = $2 AND project_id = $3 AND flag IN ('2','3')`;
    samityInfo = await await pool.query(sql, [doptorId, officeId, projectId]);
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }

  async getSamityNameList(
    userId: any,
    officeId: any,
    doptorId: any,
    districtId: any,
    upazilaID: any,
    upaCityType: any,
    projectId: any,
    value: any
  ): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, samity_name FROM samity.samity_info WHERE doptor_id = $1 AND office_id = $2 AND district_id = $3 AND upa_city_id = $4 AND upa_city_type = $5 AND project_id = $6`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, districtId, upazilaID, upaCityType, projectId]);
    } else if (value == 2) {
      sql = `SELECT data::json->'basic'->'samity_name' as samity_name, id FROM temps.staging_area
                WHERE user_id = $1 AND doptor_id = $2 AND district_id = $3 AND upa_city_id = $4 AND upa_city_type = $5 AND project_id = $6`;
      samityInfo = await await pool.query(sql, [userId, doptorId, districtId, upazilaID, upaCityType, projectId]);
    }
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }
  async getSamityNameBasedOnOffice(officeId: any, doptorId: any, projectId: any, value: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, samity_name FROM samity.samity_info 
                WHERE doptor_id = $1 AND office_id = $2 and project_id = $3`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, projectId]);
    } else if (value == 2) {
      sql = `SELECT data::json->'basic'->'samity_name' as samity_name, id FROM temps.staging_area
                WHERE doptor_id = $1 AND office_id = $2 and project_id = $3`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, projectId]);
    }
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }

  async getSamityReport(districtId: any, upazilaId: any, id: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: string;
    let samityInfo;
    sql = `SELECT distinct a.samity_code, INITCAP (a.samity_name) samity_name, INITCAP (f.institute_name) || ' ' || '(' || f.institute_code || ')' INSTITUTE_NAME, INITCAP (b.customer_code) customer_code,
        INITCAP (b.name_en) name_en, INITCAP (b.name_en) name_bn, INITCAP (b.father_name) father_name, INITCAP (b.mother_name) mother_name, 
		INITCAP (e.guardian_name) guardian_name, b.birth_date, b.age, b.mobile, d.document_no, d.doc_type_id
        FROM samity.samity_info a, samity.customer_info b, samity.nominee_info c, loan.document_info d, samity.guardian_info e, samity.institution_info f
        WHERE a.id = b.samity_id and b.id = c.customer_id and b.id = d.ref_no and b.id = e.ref_no and a.id = f.samity_id AND district_id = $1 AND upazila_id = $2 AND a.id = $3 `;
    samityInfo = await (await pool.query(sql, [districtId, upazilaId, id])).rows;

    return samityInfo.length > 0 ? (toCamelKeys(samityInfo) as any) : undefined;
  }

  async getMemberReport(page: any, limit: any, officeId: any, id: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: string;
    let memberInfo;
    const zoneService: ZoneService = Container.get(ZoneService);
    const samityService: SamityService = Container.get(SamityService);
    const dataService: DataService = Container.get(DataService);
    var docData: any = {
      own: null,
    };
    sql = `
    SELECT 
      DISTINCT INITCAP (c.doptor_name) doptor_name, 
      INITCAP (c.doptor_name_bangla) doptor_name_bangla, 
      INITCAP (d.name) office_name, 
      INITCAP (d.name_bn) office_name_bangla, 
      INITCAP (e.project_name) project_name, 
      INITCAP (e.project_name_bangla) project_name_bangla, 
      INITCAP (b.samity_name) samity_name, 
      f.district_name, 
      f.district_name_bangla, 
      g.upazila_name, 
      g.upazila_name_bangla, 
      h.union_name, 
      h.union_name_bangla, 
      INITCAP (i.institute_name) institute_name, 
      i.institute_code, 
      i.institute_address, 
      a.id,
      INITCAP (a.customer_code) customer_code, 
      INITCAP (a.name_en) name_en, 
      INITCAP (a.name_bn) name_bn, 
      INITCAP (a.father_name) father_name, 
      INITCAP (a.mother_name) mother_name, 
      a.mobile
    FROM 
      samity.customer_info a 
      LEFT JOIN samity.samity_info b ON b.id = a.samity_id 
      LEFT JOIN master.doptor_info c ON c.id = b.doptor_id 
      LEFT JOIN master.office_info d ON d.id = b.office_id 
      LEFT JOIN master.project_info e ON e.id = b.project_id 
      LEFT JOIN master.district_info f ON b.district_id = f.id 
      LEFT JOIN master.upazila_info g ON b.upazila_id = g.id 
      LEFT JOIN master.union_info h ON b.union_id = h.id 
      LEFT JOIN samity.institution_info i ON b.id = i.samity_id 
    WHERE 
      b.office_id = $1 
      AND b.id = $2`;
    if (page > 0 && limit > 0) {
      const countSql = `
                      SELECT COUNT(a.id) 
                        FROM
                          samity.customer_info a 
                          LEFT JOIN
                            samity.samity_info b 
                            ON b.id = a.samity_id
                        WHERE
                        b.office_id = $1 
                          AND b.id = $2`;
      const count = await (await pool.query(countSql, [officeId, id])).rows[0].count;

      const pagination = getPaginationDetails(page, count, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      memberInfo = await (
        await pool.query(sql + ` LIMIT $3 OFFSET $4`, [officeId, id, pagination.limit, pagination.skip])
      ).rows;
      for (const [i, v] of memberInfo.entries()) {
        let presentAddress = await zoneService.getZoneName(
          v.address_data.pre.district_id,
          v.address_data.pre.upazila_id,
          v.address_data.pre.union_id
        );
        let permanentAddress = await zoneService.getZoneName(
          v.address_data.per.district_id,
          v.address_data.per.upazila_id,
          v.address_data.per.union_id
        );
        memberInfo[i].address_data.pre = {
          ...presentAddress,
          village: v.address_data.pre.village,
          postCode: v.address_data.pre.post_code,
        };
        memberInfo[i].address_data.per = {
          ...permanentAddress,
          village: v.address_data.per.village,
          postCode: v.address_data.per.post_code,
        };

        const nidDocTypeId = await dataService.getDocTypeId("NID", pool);
        const pImageDocTypeId = await dataService.getDocTypeId("PIM", pool);
        const signDocTypeId = await dataService.getDocTypeId("SIN", pool);
        // const dImageDocTypeId = await dataService.getDocTypeId("DIM");

        // let fatherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "F",
        //   nidDocTypeId
        // );
        // let motherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "M",
        //   nidDocTypeId
        // );
        let ownDocInfoNid = await samityService.getMembersDocuments(v.id, "W", nidDocTypeId);
        let ownDocInfoPImage = await samityService.getMembersDocuments(v.id, "W", pImageDocTypeId);
        let ownDocInfoSign = await samityService.getMembersDocuments(v.id, "W", signDocTypeId);
        // let nomineeDocInfoNid = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   nidDocTypeId
        // );
        // let nomineeDocInfoPImage = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   pImageDocTypeId
        // );
        // let nomineeDocInfoSign = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   signDocTypeId
        // );
        // let guardianDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "G",
        //   nidDocTypeId
        // );

        // docData.father = fatherDocInfo[0];
        // docData.mother = motherDocInfo[0];
        docData.own = {
          memberDoc: ownDocInfoNid[0].documentNo,
          memberImage: ownDocInfoPImage[0].documentNo,
          memberSign: ownDocInfoSign[0].documentNo,
        };
        // docData.nominee = {
        //   nomineeNid: nomineeDocInfoNid,
        //   nomineePImage: nomineeDocInfoPImage,
        //   nomineeSign: nomineeDocInfoSign,
        // };
        // docData.guardian = guardianDocInfo[0];
        memberInfo[i].docData = docData;
      }

      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: count,
        data: toCamelKeys(memberInfo) as any,
      };
    } else {
      memberInfo = await (await pool.query(sql, [officeId, id])).rows;
      for (const [i, v] of memberInfo.entries()) {
        let preAddress = await samityService.getMembersAddress(v.id, 1);
        let perAddress = await samityService.getMembersAddress(v.id, 2);
        let presentAddress = await zoneService.getZoneName(
          preAddress.districtId,
          preAddress.upaCityId,
          preAddress.uniThanaPawId
        );

        let permanentAddress = await zoneService.getZoneName(
          perAddress.districtId,
          perAddress.upaCityId,
          perAddress.uniThanaPawId
        );

        memberInfo[i].presentAddress = {
          ...presentAddress,
          village: preAddress.village,
          postCode: preAddress.postCode,
        };
        memberInfo[i].permanentAddress = {
          ...permanentAddress,
          village: perAddress.village,
          postCode: perAddress.postCode,
        };

        const nidDocTypeId = await dataService.getDocTypeId("NID", pool);
        const pImageDocTypeId = await dataService.getDocTypeId("PIM", pool);
        const signDocTypeId = await dataService.getDocTypeId("SIN", pool);
        // const dImageDocTypeId = await dataService.getDocTypeId("DIM");

        // let fatherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "F",
        //   nidDocTypeId
        // );
        // let motherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "M",
        //   nidDocTypeId
        // );
        let ownDocInfoNid = await samityService.getMembersDocuments(v.id, "W", nidDocTypeId);
        let ownDocInfoPImage = await samityService.getMembersDocuments(v.id, "W", pImageDocTypeId);
        let ownDocInfoSign = await samityService.getMembersDocuments(v.id, "W", signDocTypeId);
        // let nomineeDocInfoNid = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   nidDocTypeId
        // );
        // let nomineeDocInfoPImage = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   pImageDocTypeId
        // );
        // let nomineeDocInfoSign = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   signDocTypeId
        // );
        // let guardianDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "G",
        //   nidDocTypeId
        // );

        // docData.father = fatherDocInfo[0];
        // docData.mother = motherDocInfo[0];
        docData.own = {
          memberDoc: ownDocInfoNid[0].documentNo,
          memberImage: ownDocInfoPImage[0].documentNo,
          memberSign: ownDocInfoSign[0].documentNo,
        };
        // docData.nominee = {
        //   nomineeNid: nomineeDocInfoNid,
        //   nomineePImage: nomineeDocInfoPImage,
        //   nomineeSign: nomineeDocInfoSign,
        // };
        // docData.guardian = guardianDocInfo[0];
        memberInfo[i].docData = docData;
      }

      return memberInfo[0] ? (toCamelKeys(memberInfo) as any) : [];
    }
  }
}
