import { toCamelKeys, toSnakeCase } from "keys-transform";
import lodash from "lodash";
import { Pool, PoolClient } from "pg";
import { buildGetSql, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { numberToWord } from "../../..//utils/eng-to-bangla-digit";
import db from "../../../db/connection.db";
import moment from "moment-timezone";
import BadRequestError from "../../../errors/bad-request.error";
import ZoneService from "../../../modules/master/services/zone.service";
import ServiceChargeService from "../../../modules/transaction/services/service-charge.service";
import { minioPresignedGet } from "../../../utils/minio.util";
import { emptyPaginationResponse, getPaginationDetails } from "../../../utils/pagination.util";
import {
  buildInsertSql,
  buildUpdateSql,
  buildUpdateWithWhereSql,
  buildWhereAggrSql,
  buildWhereSql,
} from "../../../utils/sql-builder.util";
import DataService from "../../master/services/master-data.service";
import TransactionService from "../../transaction/services/transaction.service";
import { ICustomerSurveyAttrs } from "../interfaces/customer.survey.interface";
import { IMemberAttendanceAttrs } from "../interfaces/member-attendance.interface";
import { ComponentType } from "../../../interfaces/component.interface";
import { RepaymentTranService } from "../../transaction/services/repayment.service";

@Service()
export default class SamityService {
  constructor() {}

  //left digit padding
  async leftPadding(number: any, length: any) {
    var finalLength = length - number.toString().length;
    return (finalLength > 0 ? new Array(++finalLength).join("0") : "") + number;
  }

  async getDisCode(id: number, transaction: PoolClient): Promise<any> {
    let sql = `SELECT district_code FROM master.district_info
                   WHERE id = $1`;
    const result = await transaction.query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }

  async getUpaCode(id: number, type: string, transaction: PoolClient) {
    let sql = `SELECT upa_city_code FROM master.mv_upazila_city_info
    WHERE upa_city_id = $1 AND upa_city_type = $2`;
    const result = await transaction.query(sql, [id, type]);
    return toCamelKeys(result.rows[0]);
  }

  async generateSamityCode(doptorId: number, officeId: number, samityAllInfo: any, transaction: PoolClient) {
    let doptor = doptorId;

    const disCode = await this.getDisCode(samityAllInfo.data.basic.districtId, transaction);
    const upaCode = (await this.getUpaCode(
      samityAllInfo.data.basic.upaCityId,
      samityAllInfo.data.basic.upaCityType,
      transaction
    )) as any;
    let samityCode;
    //max samity id

    let sqlCounter = `SELECT COUNT(id) FROM samity.samity_info WHERE doptor_id = $1`;
    const resCounter = await transaction.query(sqlCounter, [doptor]);
    const getProjectCodeSql = `SELECT project_code FROM master.project_info WHERE id = $1`;
    const projectCode = (await transaction.query(getProjectCodeSql, [samityAllInfo.projectId])).rows[0]?.project_code;

    let code: number = resCounter.rows[0].count ? Number(resCounter.rows[0].count) + 1 : 0 + 1;

    let samityCodeSerial = await this.leftPadding(code, 3);
    let dist = await this.leftPadding(disCode.districtCode, 2);
    let upazila = await this.leftPadding(upaCode.upaCityCode, 2);
    //let project = await this.leftPadding(samityAllInfo.projectId, 2);

    if (doptor == 5) {
      const branchCodeSql = `SELECT branch_code FROM master.pdbf_branch_info WHERE office_id = $1`;
      const branchCode = (await transaction.query(branchCodeSql, [officeId])).rows[0].branch_code;
      if (!branchCode) throw new BadRequestError(`ব্রাঞ্চের কোড পাওয়া যায়নি`);
      else samityCode = branchCode.toString() + projectCode.toString() + samityCodeSerial.toString();
    } else {
      samityCode = dist.toString() + upazila.toString() + projectCode.toString() + samityCodeSerial.toString();
    }

    return samityCode;
  }

  //generate member code
  async generateMemberCode(samityId: any, transaction: PoolClient) {
    //max customer id
    let sqlCus = `SELECT max(customer_code) FROM samity.customer_info WHERE samity_id = $1`;
    const resCus = await transaction.query(sqlCus, [samityId]);
    var customerCode: any = 0;
    const samityCodeSql = `SELECT samity_code FROM samity.samity_info WHERE id = $1`;
    const samityCode = (await transaction.query(samityCodeSql, [samityId])).rows[0]?.samity_code;

    if (resCus.rows[0].max) {
      customerCode = Number(resCus.rows[0].max);
      customerCode = customerCode + 1;
      let diff = resCus.rows[0].max.length - customerCode.toString().length;
      if (Math.abs(diff) == 1) customerCode = "0" + customerCode.toString();
    } else {
      let codeSerial = 0;
      const customerLastCode = await this.leftPadding(++codeSerial, 3);
      customerCode = samityCode + "" + customerLastCode.toString();
    }

    return customerCode;
  }

  //Reject dol and save in log table
  async rejectDol(info: any) {
    const client = await db.getConnection().connect();
    try {
      let count: number = 0;
      for (const [i, v] of info.allId.entries()) {
        let dolAllInfo = await this.getDol(0, 0, 0, v);
        if (!dolAllInfo) throw new BadRequestError(`দলের তথ্য পাওয়া যায়নি`);
        if (info?.userId && dolAllInfo?.userId && info.userId == dolAllInfo.userId)
          throw new BadRequestError(`দল তৈরির আবেদনকারী, দলটি বাতিল করতে পারবে না`);
        const { sql, params } = buildInsertSql("logs.log", {
          ...lodash.omit(dolAllInfo, ["id"]),
        });
        for (let singleDolMember of dolAllInfo.data.memberId) {
          let { sql: memDolIdUpadateSql, params: memDolIdUpadateParams } = buildUpdateWithWhereSql(
            "samity.customer_info",
            { id: singleDolMember },
            { subGroupId: null }
          );
          let memberUpadteRes = (await client.query(memDolIdUpadateSql, memDolIdUpadateParams)).rows[0];
        }
        const result = await client.query(sql, params);
        const deleteSql = `DELETE FROM temps.staging_area 
                              WHERE id = $1`;
        await client.query(deleteSql, [v]);

        count++;
      }
      await client.query("COMMIT");
      return `সফলভাবে সর্বমোট ${count}টি দল বাতিল করা হয়েছে`;
      //return toCamelKeys(result.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  //update samity info
  async updateSamity(id: number, newData: any, value: number) {
    const client = await db.getConnection().connect();
    let result = [];
    let response = null;
    try {
      await client.query("BEGIN");

      if (value == 1) {
        let institute: any;
        const samityInfo: any = {
          ...lodash.omit(newData, ["instituteName", "instituteAddress", "instituteCode"]),
        };

        const { sql, params } = buildUpdateSql("samity.samity_info", id, samityInfo);

        result = (await client.query(sql, params)).rows;
      } else if (value == 2) {
        const tempSamityInfo = (await this.getSamityAndMemberTempInfoByUser(0, 0, id, null, client)) as any;
        tempSamityInfo.data.basic = {
          ...tempSamityInfo.data.basic,
          ...newData.data.basic,
        };
        tempSamityInfo.data.setup = {
          ...tempSamityInfo.data.setup,
          samityMinMember: newData.data.setup.samityMinMember ? newData.data.setup.samityMinMember : 0,
          samityMaxMember: newData.data.setup.samityMaxMember ? newData.data.setup.samityMaxMember : 0,
          groupMinMember: newData.data.setup.groupMinMember ? newData.data.setup.groupMinMember : 0,
          groupMaxMember: newData.data.setup.groupMaxMember ? newData.data.setup.groupMaxMember : 0,
          shareAmount: newData.data.setup.shareAmount ? newData.data.setup.shareAmount : 0,
          memberMinAge: newData.data.setup.memberMinAge ? newData.data.setup.memberMinAge : 0,
          memberMaxAge: newData.data.setup.memberMaxAge ? newData.data.setup.memberMaxAge : 0,
          samityMemberType: (
            await client.query("SELECT id FROM master.code_master WHERE return_value = $1", [
              newData.data.setup.samityMemberType,
            ])
          ).rows[0]?.id,
        };

        const { sql, params } = buildUpdateSql("temps.application", id, {
          ...lodash.omit(tempSamityInfo, ["id"]),
        });

        result = (await client.query(sql, params)).rows[0];
        response = {
          id: parseInt(result.id),
          samityMinMember: parseInt(result.data.setup.samity_min_member),
          samityMaxMember: parseInt(result.data.setup.samity_max_member),
          memberMinAge: parseInt(result.data.setup.member_min_age),
          memberMaxAge: result.data.setup.member_max_age,
          projectId: parseInt(result.project_id),
        };
      }
      await client.query("COMMIT");

      return response ? toCamelKeys(response) : result[0] ? toCamelKeys(result[0]) : [];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  //update dol info
  async updateDol(id: number, data: any) {
    const client = await db.getConnection().connect();

    try {
      await client.query("BEGIN");
      const getSamityIdSql = `SELECT samity_id FROM samity.dol_info WHERE id =$1`;
      const samityId = (await client.query(getSamityIdSql, [id])).rows[0]?.samity_id;
      const dolData = {
        data: {
          samityId,
          memberId: data.memberList,
        },
      };
      const checkValidation = await this.validateDol(dolData, client);
      const { sql, params } = buildUpdateSql("samity.dol_info", id, {
        ...lodash.omit(data, ["removeList"]),
      });
      const updateDol = await (await client.query(sql, params)).rows[0];

      if (data.memberList && data.memberList[0]) {
        const member = data.memberList;
        for (const [i, v] of member.entries()) {
          const { sql, params } = buildUpdateWithWhereSql("samity.customer_info", { id: v }, { subGroupId: id });
          await client.query(sql, params);
        }
      }

      if (data.removeList && data.removeList[0]) {
        const removeMember = data.removeList;
        for (const [i, v] of removeMember.entries()) {
          const { sql, params } = buildUpdateWithWhereSql("samity.customer_info", { id: v }, { subGroupId: null });
          await client.query(sql, params);
        }
      }
      client.query("COMMIT");
      return updateDol ? toCamelKeys(updateDol) : [];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async updateInstitute(samityId: number, data: any) {
    var institute = {
      instituteName: data.instituteName,
      instituteCode: data.instituteCode,
      instituteAddress: data.instituteAddress,
    };
    const { sql, params } = buildUpdateWithWhereSql("samity.institution_info", { samityId }, { ...institute });
    const pool = db.getConnection();
    const result = await pool.query(sql, params);
    return result.rows[0] ? toCamelKeys(result.rows[0]) : null;
  }

  //get main member info
  async getMainMember(page: number, limit: number, filter: any) {
    const pool = db.getConnection("slave");
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM samity.customer_info",
        filter,
        this.injectionFilter
      );

      const totalCount = await (await pool.query(countSql, countParams)).rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        "SELECT * FROM samity.customer_info",
        filter,
        pagination.skip,
        pagination.limit,
        this.injectionFilter
      );
      const result = await pool.query(sql, params);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    } else {
      const countRes = await pool.query("SELECT COUNT(*) AS total FROM samity.customer_info");
      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      const sql = `
         SELECT * FROM samity.customer_info
         LIMIT $1 
         OFFSET $2
     `;
      const result = await pool.query(sql, [pagination.limit, pagination.skip]);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    }
  }

  //get samity info
  async getSamityAndMemberTempInfoByUser(
    doptorId: number,
    officeId?: number,
    id?: number,
    type?: string | null,
    transaction?: PoolClient | null
  ) {
    // hard code office id due to office layer problem, have to change after final decision
    let customOffice;
    if (doptorId == 4) customOffice = 4;
    else if (doptorId == 8) customOffice = 8;
    else if (doptorId == 9) customOffice = 9;
    else customOffice = officeId;
    const pool = transaction ? transaction : db.getConnection("slave");
    let sql;
    let samityTemp = [] as any;
    let samityTempFinal = [] as any;
    if (id != 0) {
      sql = `SELECT * FROM temps.application WHERE id = $1`;
      samityTemp = (await pool.query(sql, [id])).rows[0];
      const dayNameSql = `SELECT display_value FROM master.code_master WHERE id = $1`;
      if (!samityTemp) throw new BadRequestError(`সমিতির তথ্য পাওয়া যায়নি`);
      const foSql = `SELECT 
                      b.name_bn 
                    FROM 
                    samity.field_officer_info a
                      LEFT JOIN master.office_employee b ON a.employee_id = b.id 
                    WHERE 
                      a.user_id = $1`;
      if (samityTemp.resource_name == "samityInfo") {
        const fo = (await pool.query(foSql, [samityTemp.data.basic.fo_code])).rows[0];
        samityTemp.data.basic.fo_name = fo?.name_bn ? fo.name_bn : null;
        const dayName = (await pool.query(dayNameSql, [samityTemp.data.basic.meeting_day])).rows[0]?.display_value;
        samityTemp.data.basic.meeting_day_name = dayName;
      }

      return samityTemp ? (toCamelKeys(samityTemp) as any) : [];
    } else if (officeId && type) {
      sql = `SELECT * FROM temps.staging_area 
                WHERE office_id = $1 AND resource_name = $2 AND status = 'P' ORDER BY id ASC`;
      samityTemp = await pool.query(sql, [officeId, type]);

      const samityNameSql = `SELECT samity_name FROM samity.samity_info WHERE id = $1`;
      for (const [i, v] of samityTemp.rows.entries()) {
        if (type == "memberInfo") {
          for (const [i, member] of v.data.member_info.entries()) {
            let samityName = (await pool.query(samityNameSql, [member.data.samity_id])).rows[0]?.samity_name;
            v.data.member_info[i].data.samity_name = samityName ? samityName : undefined;
          }
        }
        if (v.data.member_info && v.data.member_info.length > 0) samityTempFinal.push(v);
      }
      return samityTempFinal[0] ? (toCamelKeys(samityTempFinal) as any) : [];
    } else if (!officeId && type && (doptorId == 4 || doptorId == 8 || doptorId == 9)) {
      // const officeIdSql = `SELECT id FROM master.office_info WHERE doptor_id = $1`;
      // officeId = (await pool.query(officeIdSql, [doptorId])).rows[0]?.id;
      sql = `SELECT * FROM temps.staging_area 
                WHERE office_id = $1 AND resource_name = $2 AND status = 'P' ORDER BY id ASC`;
      samityTemp = await pool.query(sql, [customOffice, type]);

      const samityNameSql = `SELECT samity_name FROM samity.samity_info WHERE id = $1`;
      for (const [i, v] of samityTemp.rows.entries()) {
        if (type == "memberInfo") {
          for (const [i, member] of v.data.member_info.entries()) {
            let samityName = (await pool.query(samityNameSql, [member.data.samity_id])).rows[0].samity_name;
            v.data.member_info[i].data.samity_name = samityName;
          }
        }
        if (v.data.member_info && v.data.member_info.length > 0) samityTempFinal.push(v);
      }
      return samityTempFinal[0] ? (toCamelKeys(samityTempFinal) as any) : [];
    }
  }

  //get dol info
  async getDol(officeId?: any, samity?: any, value?: any, id?: any) {
    const pool = db.getConnection("slave");
    let sql;
    let dolInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, dol_name FROM samity.dol_info 
                WHERE samity_id = $1`;
      dolInfo = await pool.query(sql, [samity]);
      return dolInfo.rows ? (toCamelKeys(dolInfo.rows) as any) : dolInfo.rows;
    } else if (value == 2) {
      //for temp
      if (officeId != 0 && samity != 0) {
        sql = `
          SELECT 
            a.id, 
            a.data, 
            b.samity_name, 
            c.project_name, 
            c.project_name_bangla
          FROM temps.staging_area a
            LEFT JOIN samity.samity_info b
              ON CAST(a.data ->>'samity_id' as integer) = CAST(b.id as integer)
            LEFT JOIN master.project_info c
              ON a.project_id = c.id
          WHERE 
            a.office_id = $1 AND 
            CAST(a.data->>'samity_id' as integer) = $2 AND 
            a.resource_name = 'dolInfo'`;
        dolInfo = await pool.query(sql, [officeId, Number(samity)]);
        return dolInfo.rows[0] ? (toCamelKeys(dolInfo.rows) as any) : [];
      }
    } else {
      sql = `SELECT * FROM temps.staging_area 
                WHERE id = $1 AND resource_name = 'dolInfo'`;
      dolInfo = await pool.query(sql, [id]);
      return dolInfo.rows[0] ? (toCamelKeys(dolInfo.rows[0]) as any) : dolInfo.rows[0];
    }
  }

  //get samity name
  async getSamityNameByUser(
    officeId: number,
    doptorId: number,
    value: number,
    project: number | null,
    coop?: number | null,
    samityType?: string | null
  ) {
    const pool = db.getConnection("slave");
    let sql: string;
    let samityTemp = [] as any;

    if (coop == 0) {
      if (value == 1) {
        if (samityType) {
          sql = `SELECT 
                  id, 
                  samity_name,
                  samity_member_type 
                FROM 
                  samity.samity_info 
                WHERE 
                  doptor_id = $1 
                  AND office_id = $2 
                  AND CASE WHEN CAST($3 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $3 END  
                  AND flag NOT IN('1', '4') 
                  AND samity_type = $4 
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, officeId, project, samityType])).rows;
        } else {
          sql = `SELECT 
                  id, 
                  samity_name,
                  samity_member_type  
                FROM 
                  samity.samity_info 
                WHERE 
                  doptor_id = $1 
                  AND office_id = $2 
                  AND CASE WHEN CAST($3 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $3 END 
                  AND flag NOT IN('1', '4') 
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, officeId, project])).rows;
        }
      } else if (value == 2) {
        if (samityType) {
          sql = `SELECT 
                  id, 
                  data,
                  next_app_designation_id,
									data->'setup'->>'samity_member_type' samity_member_type
                FROM
                  temps.application
                WHERE 
                  doptor_id = $1 
                  AND CAST(
                    data -> 'basic' ->> 'flag' AS INTEGER
                  ) NOT IN('1', '4') 
                  AND (
                    data :: json -> 'basic' ->> 'samity_type'
                  ):: varchar = $2 
                  AND CASE WHEN CAST($3 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $3 END  
                  AND status != 'A'
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, samityType, project])).rows;
          let newData = [];
          for (let value of samityTemp) {
            let singleSamityTemp = value
              ? await minioPresignedGet(value, [
                  "data.member_info.[].member_picture",
                  "data.member_info.[].member_sign",
                  "data.member_info.[].data.member_documents.[].document_front",
                  "data.member_info.[].data.member_documents.[].document_back",
                  "data.member_info.[].nominee.[].nominee_sign",
                  "data.member_info.[].nominee.[].nominee_picture",
                ])
              : {};
            if (singleSamityTemp) newData.push(singleSamityTemp);
            else newData.push(value);
          }
          return newData[0] ? toCamelKeys(newData) : [];
        } else {
          sql = `SELECT 
                  id, 
                  data,
                  next_app_designation_id,
									data->'setup'->>'samity_member_type' samity_member_type
                FROM 
                  temps.application 
                WHERE 
                  doptor_id = $1 
                  AND CAST(
                    data -> 'basic' ->> 'flag' AS INTEGER
                  ) NOT IN('1', '4') 
                  AND CASE WHEN CAST($2 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $2 END  
                  AND status != 'A'
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, project])).rows;
          samityTemp = samityTemp ? toCamelKeys(samityTemp) : samityTemp;
          let newData = [];
          for (let value of samityTemp) {
            for (let [singleMemberIndex, singleMember] of value.data.memberInfo.entries()) {
              for (let [singleDocIndex, singleDoc] of singleMember.data.memberDocuments.entries()) {
                if (singleDoc.documentNumber) {
                  singleDoc.isDocNoMandatory = true;
                } else {
                  singleDoc.isDocNoMandatory = false;
                }
                singleMember.data.memberDocuments[singleDocIndex] = singleDoc;
              }
              value.data.memberInfo[singleMemberIndex] = singleMember;
            }

            let singleSamityTemp = value
              ? await minioPresignedGet(value, [
                  "data.memberInfo.[].memberPicture",
                  "data.memberInfo.[].memberSign",
                  "data.memberInfo.[].data.memberDocuments.[].documentFront",
                  "data.memberInfo.[].data.memberDocuments.[].documentBack",
                  "data.memberInfo.[].nominee.[].nomineeSign",
                  "data.memberInfo.[].nominee.[].nomineePicture",
                ])
              : {};
            if (singleSamityTemp) newData.push(singleSamityTemp);
            else newData.push(value);
          }

          return newData[0] ? toCamelKeys(newData) : [];
        }
      }
    } else {
      if (value == 1) {
        if (samityType) {
          sql = `SELECT 
                  id, 
                  samity_name,
                  samity_member_type  
                FROM 
                  samity.samity_info 
                WHERE 
                  doptor_id = $1 
                  AND office_id = $2 
                  AND CASE WHEN CAST($3 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $3 END 
                  AND samity_type = $4 
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, officeId, project, samityType])).rows;
        } else {
          sql = `SELECT 
                  id, 
                  samity_name,
                  samity_member_type  
                FROM 
                  samity.samity_info 
                WHERE 
                  doptor_id = $1 
                  AND office_id = $2 
                  AND CASE WHEN CAST($3 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $3 END  
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, officeId, project])).rows;
        }
      } else if (value == 2) {
        if (samityType) {
          sql = `SELECT 
                  id, 
                  data,
                  next_app_designation_id,
									data->'setup'->>'samity_member_type' samity_member_type
                FROM 
                  temps.application 
                WHERE 
                  doptor_id = $1 
                  AND (
                    data :: json -> 'basic' ->> 'samity_type'
                  ):: varchar = $2
                  AND CASE WHEN CAST($3 AS INTEGER) IS NULL THEN project_id IS NULL 
                      ELSE project_id = $3 END 
                  AND status != 'A'
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, samityType, project])).rows;

          let newData = [];
          for (let value of samityTemp) {
            let singleSamityTemp = value
              ? await minioPresignedGet(value, [
                  "data.member_info.[].member_picture",
                  "data.member_info.[].member_sign",
                  "data.member_info.[].data.member_documents.[].document_front",
                  "data.member_info.[].data.member_documents.[].document_back",
                  "data.member_info.[].nominee.[].nominee_sign",
                  "data.member_info.[].nominee.[].nominee_picture",
                ])
              : {};
            if (singleSamityTemp) newData.push(singleSamityTemp);
            else newData.push(value);
          }
          return newData[0] ? toCamelKeys(newData) : [];
        } else {
          sql = `SELECT 
                  id, 
                  data,
                  next_app_designation_id,
									data->'setup'->>'samity_member_type' samity_member_type
                FROM 
                  temps.application 
                WHERE 
                  doptor_id = $1 
                  AND CASE WHEN CAST($2 AS INTEGER) IS NULL THEN project_id IS NULL 
                        ELSE project_id = $2 END  
                  AND status != 'A'
                ORDER BY 
                  id ASC`;
          samityTemp = (await pool.query(sql, [doptorId, project])).rows;
          let newData = [];
          for (let value of samityTemp) {
            let singleSamityTemp = value
              ? await minioPresignedGet(value, [
                  "data.member_info.[].member_picture",
                  "data.member_info.[].member_sign",
                  "data.member_info.[].data.member_documents.[].document_front",
                  "data.member_info.[].data.member_documents.[].document_back",
                  "data.member_info.[].nominee.[].nominee_sign",
                  "data.member_info.[].nominee.[].nominee_picture",
                ])
              : {};
            if (singleSamityTemp) newData.push(singleSamityTemp);
            else newData.push(value);
          }
          return newData[0] ? toCamelKeys(newData) : [];
        }
      }
    }
    return samityTemp[0] ? (toCamelKeys(samityTemp) as any) : [];
  }

  //get member info by office id
  async getMember(officeId: number): Promise<ICustomerSurveyAttrs> {
    const pool = db.getConnection("slave");
    let allNidNumbers = [];
    const docsSql = `SELECT document_data::json-> 'own' AS own_docs
                        FROM loan.document_info`;
    let docs = (await pool.query(docsSql)).rows;
    for (let singleMemberDoc of docs) {
      for (let singleDoc of singleMemberDoc["own_docs"]) {
        if (singleDoc.document_type == "NID" && singleDoc.document_number)
          allNidNumbers.push(singleDoc.document_number);
      }
    }

    const membersSql = `SELECT 
                          * 
                        FROM 
                          temps.customer_survey_info 
                        WHERE 
                          office_id = $1 
                        ORDER BY 
                          id ASC`;
    const members = (await pool.query(membersSql, [officeId])).rows;

    for (let [index, singleMember] of members.entries()) {
      if (allNidNumbers.includes(singleMember.nid)) members.splice(index, 1);
    }
    return members[0] ? toCamelKeys(members) : [];
  }

  //get single samity
  async getSingleSamity(value: number, id: number) {
    const pool = db.getConnection("slave");
    let sql: string;
    let samityInfo = [] as any;
    const codeTypeSql = `SELECT return_value FROM master.code_master WHERE id = $1`;
    if (value == 1) {
      sql = `SELECT 
              *, 
              (
                select 
                  COUNT(b.id) 
                from 
                  samity.customer_info b 
                  inner join master.code_master c on b.gender = c.id 
                where 
                  samity_id = a.id 
                  and c.return_value = 'MAL'
              ) male_member_count, 
              (
                select 
                  COUNT(b.id) 
                from 
                  samity.customer_info b 
                  inner join master.code_master c on b.gender = c.id 
                where 
                  samity_id = a.id 
                  and c.return_value = 'FML'
              ) female_member_count 
            FROM 
              samity.samity_info a 
            WHERE 
              id = $1`;
      samityInfo = (await pool.query(sql, [id])).rows;
      if (!samityInfo[0]) throw new BadRequestError(`সমিতির তথ্য পাওয়া যায়নি`);
      samityInfo[0]["samity_member_type"] = (
        await pool.query(codeTypeSql, [samityInfo[0].samity_member_type])
      ).rows[0]?.return_value;
      if (!samityInfo[0].week_position) samityInfo[0].meeting_type = "W";
      else samityInfo[0].meeting_type = "M";
    } else if (value == 2) {
      sql = `SELECT * FROM temps.application
                WHERE id = $1`;
      var samityInfoTemp = [lodash.pickBy((await pool.query(sql, [id])).rows[0])];
      if (!samityInfoTemp[0]) throw new BadRequestError(`সমিতির তথ্য পাওয়া যায়নি`);
      if (samityInfoTemp[0]) {
        const memberMaleTypeId = (await pool.query("SELECT id FROM master.code_master WHERE return_value = 'MAL'"))
          .rows[0]?.id;
        const memberFemaleTypeId = (await pool.query("SELECT id FROM master.code_master WHERE return_value = 'FML'"))
          .rows[0]?.id;
        const maleMemberCount = samityInfoTemp[0].data.member_info.filter(
          (value: any) => value.data.gender == memberMaleTypeId?.toString()
        ).length;
        const femaleMemberCount = samityInfoTemp[0].data.member_info.filter(
          (value: any) => value.data.gender == memberFemaleTypeId?.toString()
        ).length;
        let shareAmount = samityInfoTemp[0]?.data?.basic?.setup?.share_amount
          ? samityInfoTemp[0].data.basic.setup.share_amount
          : null;
        let coopSamityId = samityInfoTemp[0]?.data?.basic?.coop_samity_id
          ? samityInfoTemp[0].data.basic.coop_samity_id
          : null;
        samityInfo = [
          {
            id: samityInfoTemp[0].id,
            samityName: samityInfoTemp[0].data.basic.samity_name,
            samityMemberType: (await pool.query(codeTypeSql, [samityInfoTemp[0].data.setup.samity_member_type])).rows[0]
              ?.return_value,
            doptorId: samityInfoTemp[0].doptor_id,
            officeId: samityInfoTemp[0].office_id,
            projectId: samityInfoTemp[0].project_id,
            districtId: samityInfoTemp[0].data.basic.district_id,
            upaCityId: samityInfoTemp[0].data.basic.upa_city_id,
            upaCityType: samityInfoTemp[0].data.basic.upa_city_type,
            uniThanaPawId: samityInfoTemp[0].data.basic.uni_thana_paw_id,
            uniThanaPawType: samityInfoTemp[0].data.basic.uni_thana_paw_type,
            vilageName: samityInfoTemp[0].data.basic.village_name,
            address: samityInfoTemp[0].data.basic.address,
            workPlaceLat: samityInfoTemp[0].data.basic.work_place_lat,
            workPlaceLong: samityInfoTemp[0].data.basic.work_place_long,
            workAreaRadius: samityInfoTemp[0].data.basic.work_area_radius,
            memberMinAge: samityInfoTemp[0].data.setup.member_min_age,
            memberMaxAge: samityInfoTemp[0].data.setup.member_max_age,
            samityMinMember: samityInfoTemp[0].data.setup.samity_min_member,
            samityMaxMember: samityInfoTemp[0].data.setup.samity_max_member,
            groupMinMember: samityInfoTemp[0].data.setup.group_min_member,
            groupMaxMember: samityInfoTemp[0].data.setup.group_max_member,
            instituteCode: samityInfoTemp[0]?.data?.basic?.institute_code
              ? samityInfoTemp[0].data.basic.institute_code
              : null,
            instituteName: samityInfoTemp[0]?.data?.basic?.institute_name
              ? samityInfoTemp[0].data.basic.institute_name
              : null,
            instituteAddress: samityInfoTemp[0]?.data?.basic?.institute_address
              ? samityInfoTemp[0].data.basic.institute_address
              : null,
            foCode: samityInfoTemp[0].data.basic.fo_code,
            shareAmount: samityInfoTemp[0].data.setup.share_amount,
            meetingType: samityInfoTemp[0].data.basic.meeting_type,
            meetingDay: samityInfoTemp[0].data.basic.meeting_day,
            weekPosition:
              samityInfoTemp[0].data.basic.week_position && samityInfoTemp[0].data.basic.meeting_type == "M"
                ? samityInfoTemp[0].data.basic.week_position
                : null,
            admissionFee: samityInfoTemp[0].data.setup.admission_fee,
            passbookFee: samityInfoTemp[0].data.setup.passbook_fee,
            isSme: samityInfoTemp[0].data.basic.is_sme,
            ...(shareAmount && { shareAmount }),
            ...(coopSamityId && { coopSamityId }),
            maleMemberCount: maleMemberCount ? maleMemberCount : 0,
            femaleMemberCount: femaleMemberCount ? femaleMemberCount : 0,
          },
        ];
        samityInfo = [lodash.pickBy(samityInfo[0])];
      } else samityInfo = [];
    }
    return samityInfo[0] ? (toCamelKeys(samityInfo) as any) : [];
  }

  //get single dol
  async getSingleDol(value: number, id: number, flag: number) {
    const pool = db.getConnection("slave");
    let sql: string;
    var memberInfo;
    var member;
    if (value == 1) {
      sql = `SELECT member_list FROM samity.dol_info 
                WHERE id = $1`;
      var dolInfoTemp = (await pool.query(sql, [id])).rows;
      member = dolInfoTemp[0].member_list;
    } else if (value == 2) {
      sql = `SELECT data::json->'member_id' as member, id FROM temps.staging_area
                WHERE id = $1`;
      var dolInfoTemp = (await pool.query(sql, [id])).rows;
      member = dolInfoTemp[0].member;
    }
    var info = [] as any;
    for (const [i, v] of member.entries()) {
      //for edit
      if (flag == 2) {
        sql = `SELECT b.id, a.dol_name, a.is_active, b.customer_code, b.name_bn, b.father_name, b.mother_name, b.mobile FROM samity.dol_info a inner join samity.customer_info b
        on a.id = b.sub_group_id where b.id = $1 AND a.id = $2`;
        memberInfo = (await pool.query(sql, [member[i], id])).rows;
        if (memberInfo[0]) info.push(memberInfo[0]);
      }
      //for approval
      else if (flag == 1) {
        sql = `SELECT * FROM samity.customer_info 
          where id = $1`;
        memberInfo = (await pool.query(sql, [member[i]])).rows;
        if (memberInfo[0]) info.push(memberInfo[0]);
      }
    }

    return info[0] ? toCamelKeys(info) : [];
  }

  async getCustomerProducts(doptorId: number, projectId: number, depositNature: string, transaction: PoolClient) {
    let sql = `SELECT id FROM loan.product_mst WHERE doptor_id = $1 AND project_id = $2 AND 
    deposit_nature = $3 AND is_default_savings = true`;
    const result = await await transaction.query(sql, [doptorId, projectId, depositNature]);

    return result?.rows[0] ? result.rows[0].id : undefined;
  }

  //create dol temp
  async createDol(data: any) {
    const client = await db.getConnection("master").connect();

    const checkValidation = await this.validateDol(data, client);
    try {
      const { sql: dolSql, params: dolParams } = buildInsertSql("temps.staging_area", {
        ...data,
      });
      const member = data.data.memberId;
      for (const [i, v] of member.entries()) {
        const { sql: memSql, params: memberParams } = buildUpdateWithWhereSql(
          "samity.customer_info",
          { id: v },
          { subGroupId: 0 }
        );

        const memberInfo = await client.query(memSql, [0, v]);
      }
      const result = (await client.query(dolSql, dolParams)).rows[0];
      return result ? toCamelKeys(result) : [];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  //create dol final
  async approveDol(info: any) {
    const client = await db.getConnection().connect();
    try {
      let count: number = 0;

      for (const [i, v] of info.allId.entries()) {
        let samityAllInfo = await this.getDol(0, 0, 0, v);
        if (!samityAllInfo) throw new BadRequestError(`দলের তথ্য পাওয়া যায়নি`);
        if (info?.userId && samityAllInfo?.userId && info.userId == samityAllInfo.userId)
          throw new BadRequestError(`দল তৈরির আবেদনকারী, দলটি অনুমোদন করতে পারবে না`);
        var result: any;
        await client.query("BEGIN");
        const { sql, params } = buildInsertSql("samity.dol_info", {
          dolName: samityAllInfo.data.dolName,
          projectId: samityAllInfo.projectId,
          doptorId: samityAllInfo.doptorId,
          officeId: info.officeId,
          samityId: samityAllInfo.data.samityId,
          memberList: samityAllInfo.data.memberId,
          createdBy: samityAllInfo.userId,
          createdAt: samityAllInfo.createDate,
          authorizeStatus: "A",
          authorizedBy: info.userId,
          authorizedAt: new Date(),
        });
        result = await (await client.query(sql, params)).rows[0];

        if (!result) throw new BadRequestError("নতুন তৈরিকৃত দলের তথ্য পাওয়া যায়নি");

        const member = samityAllInfo.data.memberId;
        for (const [i, v] of member.entries()) {
          const { sql, params } = buildUpdateWithWhereSql(
            "samity.customer_info",
            { id: parseInt(v) },
            { subGroupId: result.id }
          );

          let memberInfo = await client.query(sql, params);
          //info.push(memberInfo[0]);
        }

        //after approval, save a log data
        const finalLog = lodash.omit(samityAllInfo, ["id"]);
        const { sql: logSql, params: logParams } = buildInsertSql("logs.log", {
          ...finalLog,
          status: "A",
          createdBy: info.userId,
          createDate: new Date(),
        });
        const reslog = await client.query(logSql, logParams);

        //delete samity temp data for a specific user
        const deleteSql = `DELETE FROM temps.staging_area 
                                WHERE id = $1`;
        await client.query(deleteSql, [v]);
        count++;
      }
      await client.query("COMMIT");
      return `সফলভাবে সর্বমোট ${count}টি দল অনুমোদন করা হয়েছে`;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  //get member info by samity id
  async getMemberList(samityId: number, flag: number, withAddress: boolean = false, defaultMembers?: number) {
    const pool = db.getConnection("slave");
    let sql;
    let result;
    if (flag == 1) {
      if (defaultMembers) {
        sql = `SELECT 
                id, 
                customer_code, 
                name_bn, 
                name_en, 
                father_name, 
                mother_name, 
                mobile, 
                customer_status 
              FROM 
                samity.customer_info 
              WHERE 
                samity_id = $1 
              ORDER BY 
                id`;
        result = (await pool.query(sql, [samityId])).rows;
        return result[0] ? toCamelKeys(result) : [];
      } else {
        sql = `select 
                distinct(id) as id, 
                customer_code, 
                name_bn, 
                name_en, 
                father_name, 
                mother_name, 
                mobile, 
                customer_status,
                email, 
                gender,
                occupation,
                birth_date
              from samity.customer_info 
              where 
                samity_id = $1
              order by id`;
        const documentType = 1; //nid
        result = (await pool.query(sql, [samityId])).rows;

        if (withAddress) {
          const members: any[] = [];
          for await (const r of result) {
            const addresses = await this.getAddressesById(r.id);
            members.push({ ...r, addresses });
          }

          return toCamelKeys(members);
        }
      }
    } else if (flag == 2) {
      //for create dol
      sql = `SELECT 
              id, 
              customer_code, 
              name_bn, 
              father_name, 
              mother_name, 
              mobile 
            FROM 
              samity.customer_info 
            WHERE 
              samity_id = $1 AND 
              sub_group_id IS null 
            ORDER BY id`;
      const result = (await pool.query(sql, [samityId])).rows;
      return result[0] ? toCamelKeys(result) : [];
    } else if (flag == 3) {
      sql = `select 
                distinct(id) as id, 
                member_code as customer_code, 
                member_name_bangla as name_bn, 
                member_name as name_en, 
                father_name, 
                mother_name, 
                mobile, 
                is_active as customer_status,
                email, 
                gender_id as gender,
                occupation_id as occupation,
                dob as birth_date
              from coop.member_info 
              where 
                samity_id = $1
              order by id`;
      const documentType = 1; //nid
      result = (await pool.query(sql, [samityId])).rows;

      if (withAddress) {
        const members: any[] = [];
        for await (const r of result) {
          const addresses = await this.getAddressesOfCoopById(samityId, r.id);
          members.push({ ...r, addresses });
        }

        return toCamelKeys(members);
      }
    }
  }

  async getAddressesById(id: number, addressFor: string = "CUS") {
    const connection = db.getConnection("slave");
    const query = `
    select 
      a.district_id,
      a.upa_city_id,
      a.uni_thana_paw_id,
      a.post_code,
      a.village,
      a.ward_no,
      a.road_no,
      a.holding_no,
      a.address_data,
      a.address_type_id,
	    b.return_value as address_type
    from master.address_info a 
    inner join master.code_master b on b.id = a.address_type_id
    where 
      a.ref_no = $1 and 
      a.address_for = $2;
    `;
    const params = [id, addressFor];

    const addresses = await (await connection.query(query, params)).rows;
    console.log({ addresses });

    return toCamelKeys(addresses);
  }

  async getAddressesOfCoopById(samity_id: number, member_id: number) {
    const connection = db.getConnection("slave");

    const selectedColumnAddrss = ["address_type", "district_id", "upa_city_id", "details_address"];

    const addressQuery = buildGetSql(selectedColumnAddrss, "coop.member_address_info", {
      samity_id,
      member_id,
    });

    const { rows: addresses } = await (await connection).query(addressQuery.queryText, addressQuery.values);

    return toCamelKeys(addresses);
  }

  async updateSyncTime(
    samityId: number,
    componentName: ComponentType,
    userId: number,
    dbConnection: Pool | PoolClient
  ) {
    let samityTableName;
    if (componentName === "loan") samityTableName = "samity.samity_info";
    else if (componentName === "coop") samityTableName = "coop.samity_info";
    else throw new BadRequestError("Invalid Component");

    const { sql, params } = buildUpdateSql(samityTableName, samityId, {
      dashboard_sync: new Date(),
      updatedBy: userId,
      updatedAt: new Date(),
    });

    await dbConnection.query(sql, params);
  }

  async getSingleMember(id: any) {
    const zoneService: ZoneService = Container.get(ZoneService);
    const dataService: DataService = Container.get(DataService);
    const pool = db.getConnection("slave");
    let sqlMember: string = `SELECT 
                              a.*, 
                              b.samity_type 
                            FROM 
                              samity.customer_info a 
                              LEFT JOIN samity.samity_info b ON a.samity_id = b.id 
                            WHERE 
                              a.id = $1`;
    let memberInfo = await (await pool.query(sqlMember, [id])).rows[0];
    if (!memberInfo) throw new BadRequestError("সদস্য তথ্য পাওয়া যায়নি");
    let sqlNominee: string = `SELECT 
                                a.id,  
                                nominee_name, 
                                relation, 
                                percentage,
                                account_id,
                                dob
                              FROM 
                                samity.nominee_info a 
                              WHERE 
                                customer_id = $1
                                AND account_id IS null 
                                AND is_active = true`;
    let nomineeInfo = (await pool.query(sqlNominee, [id])).rows;
    let sqlDoc: string = `SELECT document_data FROM loan.document_info a WHERE a.ref_no = $1`;
    let documentData = await (await pool.query(sqlDoc, [id])).rows[0].document_data;
    documentData = documentData ? toCamelKeys(documentData) : {};
    let defDocs = (await dataService.getServiceWiseDocs(memberInfo.doptor_id, memberInfo.project_id, 14)) as any;
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;

    if (Array.isArray(documentData.own)) {
      for (let [index, singleOwnDoc] of documentData.own.entries()) {
        let isDocNoMandatoryCheck = defDocs.memberDocs.filter(
          (value: any) => value.docTypeId == singleOwnDoc.documentTypeId
        );
        documentData.own[index] = {
          ...documentData.own[index],
          isDocNoMandatory: isDocNoMandatoryCheck[0]?.isDocNoMandatory
            ? isDocNoMandatoryCheck[0].isDocNoMandatory
            : true,
          docTypeDesc: (await pool.query(getDocTypeNameSql, [singleOwnDoc.documentTypeId])).rows[0]?.doc_type_desc,
        };
      }
    }
    const addressSql = `
            SELECT 
              c.address_type, 
              b.district_id, 
              b.district_name, 
              b.district_name_bangla, 
              b.upa_city_id, 
              b.upa_city_name, 
              b.upa_city_name_bangla, 
              b.upa_city_type, 
              b.uni_thana_paw_id, 
              b.uni_thana_paw_name, 
              b.uni_thana_paw_name_bangla, 
              b.uni_thana_paw_type,
              a.post_code,
              a.village
            FROM 
              master.address_info a 
              LEFT JOIN master.mv_union_thana_paurasabha_info b ON a.district_id = b.district_id 
              AND a.upa_city_id = b.upa_city_id 
              AND a.uni_thana_paw_id = b.uni_thana_paw_id 
              LEFT JOIN master.address_type c ON a.address_type_id = c.id 
            WHERE 
              a.ref_no = $1`;

    const addressInfo = (await pool.query(addressSql, [id])).rows;

    for (const address of addressInfo) {
      if (address.address_type == "PRE") {
        lodash.assign(memberInfo, { presentAddress: address });
        //memberInfo.presentAddress = address;
      } else if (address.address_type == "PER") {
        lodash.assign(memberInfo, { permanentAddress: address });
      }
    }
    const guardianSql = `SELECT guardian_name, occupation, relation FROM samity.guardian_info WHERE ref_no = $1`;
    const guardianInfo = (await pool.query(guardianSql, [id])).rows[0];
    nomineeInfo.map((nomineeValue: any, index: number) => {
      documentData.nominee.map((nomineeDocValue: any, index: number) => {
        if (nomineeValue.id == nomineeDocValue.nomineeId) {
          nomineeInfo[index] = {
            ...nomineeInfo[index],
            ...lodash.omit(nomineeDocValue, ["nomineeId"]),
          };
        }
      });
    });
    nomineeInfo = nomineeInfo.map(({ dob: birthDate, ...rest }) => ({
      birthDate,
      ...rest,
    }));
    const finalDoc = lodash.omit(documentData, ["nominee"]);
    const finalInfo: any = {
      ...memberInfo,
      guardianInfo,
      documentData: { ...finalDoc },
      nomineeInfo,
    };

    return finalInfo ? (toCamelKeys(finalInfo) as any) : [];
  }
  async getSingleMainMemberForUpdate(id: any) {
    const zoneService: ZoneService = Container.get(ZoneService);
    const dataService: DataService = Container.get(DataService);
    const pool = db.getConnection("slave");
    let sqlMember: string = `SELECT 
                              a.*, 
                              b.samity_type 
                            FROM 
                              samity.customer_info a 
                              LEFT JOIN samity.samity_info b ON a.samity_id = b.id 
                            WHERE 
                              a.id = $1`;
    let memberAllInfo = await (await pool.query(sqlMember, [id])).rows[0];
    if (!memberAllInfo) throw new BadRequestError("সদস্য তথ্য পাওয়া যায়নি");
    memberAllInfo = memberAllInfo ? toCamelKeys(memberAllInfo) : memberAllInfo;
    let sqlDoc: string = `SELECT document_data FROM loan.document_info a WHERE a.ref_no = $1`;
    let documentData = await (await pool.query(sqlDoc, [id])).rows[0].document_data;
    documentData = documentData ? toCamelKeys(documentData) : {};
    let defDocs = (await dataService.getServiceWiseDocs(memberAllInfo.doptorId, memberAllInfo.projectId, 14)) as any;
    if (Array.isArray(documentData.own)) {
      const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;

      for (let [index, singleOwnDoc] of documentData.own.entries()) {
        let isDocNoMandatoryCheck = defDocs.memberDocs.filter(
          (value: any) => value.docTypeId == singleOwnDoc.documentTypeId
        );
        documentData.own[index] = {
          ...documentData.own[index],
          isDocNoMandatory: isDocNoMandatoryCheck[0]?.isDocNoMandatory
            ? isDocNoMandatoryCheck[0].isDocNoMandatory
            : true,
          docTypeDesc: (await pool.query(getDocTypeNameSql, [singleOwnDoc.documentTypeId])).rows[0]?.doc_type_desc,
        };
      }
    }
    const addressSql = `
            SELECT 
              c.address_type, 
              b.district_id, 
              b.district_name, 
              b.district_name_bangla, 
              b.upa_city_id, 
              b.upa_city_name, 
              b.upa_city_name_bangla, 
              b.upa_city_type, 
              b.uni_thana_paw_id, 
              b.uni_thana_paw_name, 
              b.uni_thana_paw_name_bangla, 
              b.uni_thana_paw_type,
              a.post_code,
              a.village
            FROM 
              master.address_info a 
              LEFT JOIN master.mv_union_thana_paurasabha_info b ON a.district_id = b.district_id 
              AND a.upa_city_id = b.upa_city_id 
              AND a.uni_thana_paw_id = b.uni_thana_paw_id 
              LEFT JOIN master.address_type c ON a.address_type_id = c.id 
            WHERE 
              a.ref_no = $1`;

    const addressInfo = (await pool.query(addressSql, [id])).rows;
    const guardianSql = `SELECT guardian_name, occupation, relation FROM samity.guardian_info WHERE ref_no = $1`;
    const guardianInfo = (await pool.query(guardianSql, [id])).rows[0];
    let sqlNominee: string = `SELECT 
                                a.id,  
                                nominee_name, 
                                relation, 
                                percentage,
                                dob
                              FROM 
                                samity.nominee_info a 
                              WHERE 
                                customer_id = $1 
                                AND is_active = true
                                AND account_id IS NULL`;
    let nomineeInfo = (await pool.query(sqlNominee, [id])).rows;

    nomineeInfo.map((nomineeValue: any, index: number) => {
      documentData.nominee.map((nomineeDocValue: any, index: number) => {
        if (nomineeValue.id == nomineeDocValue.nomineeId) {
          nomineeInfo[index] = {
            ...nomineeInfo[index],
            ...lodash.omit(nomineeDocValue, ["nomineeId", "docType"]),
          };
        }
      });
    });

    const finalNomineeInfo = nomineeInfo.map(
      ({ documentNo: docNumber, documentType: docType, dob: birthDate, ...rest }) => ({
        docNumber,
        docType,
        birthDate,
        ...rest,
      })
    );
    let memberInfo = {
      data: {},
      address: { pre: {}, per: {} },
      guardianInfo: {},
      nominee: [],
      memberSign: "",
      memberPicture: "",
    };
    memberInfo.data = {
      samityLevel: 1,
      samityId: memberAllInfo?.samityId,
      nameBn: memberAllInfo?.nameBn,
      nameEn: memberAllInfo?.nameEn,
      projectId: memberAllInfo?.projectId,
      age: memberAllInfo?.age,
      fatherName: memberAllInfo?.fatherName,
      motherName: memberAllInfo?.motherName,
      birthDate: memberAllInfo?.birthDate,
      mobile: memberAllInfo?.mobile,
      religion: memberAllInfo?.religion,
      gender: memberAllInfo?.gender,
      maritalStatus: memberAllInfo?.maritalStatus,
      education: memberAllInfo?.education,
      occupation: memberAllInfo?.occupation,
      yearlyIncome: memberAllInfo?.yearlyIncome,
      email: memberAllInfo?.email,
      fatherNid: documentData?.father?.documentNo,
      motherNid: documentData?.mother?.documentNo,
      classId: memberAllInfo?.classId,
      secondaryOccupation: memberAllInfo?.secondaryOccupation,
      rollNo: memberAllInfo?.rollNo,
      section: memberAllInfo?.section,
      transactionType: memberAllInfo?.transactionType,
      bankId: memberAllInfo?.bankId,
      branchId: memberAllInfo?.branchId,
      accountNo: memberAllInfo?.accountNo,
      accountTitle: memberAllInfo?.accountTitle,
      committeeRoleId: memberAllInfo?.committeeRoleId,
      memberDocuments: documentData.own,
    };
    for (const address of addressInfo) {
      if (address.address_type == "PRE") memberInfo.address.pre = address;
      else if (address.address_type == "PER") memberInfo.address.per = address;
    }
    memberInfo.guardianInfo = {
      guardianName: guardianInfo?.guardian_name ? guardianInfo.guardian_name : null,
      documentNo: documentData?.guardian?.documentNo ? documentData.guardian.documentNo : null,
      occupation: guardianInfo?.occupation ? guardianInfo.occupation : null,
      relation: guardianInfo?.relation ? guardianInfo.relation : null,
    };
    memberInfo.nominee = finalNomineeInfo as any;
    memberInfo.memberPicture = documentData.memberPicture;
    memberInfo.memberSign = documentData.memberSign;

    return memberInfo ? (toCamelKeys(memberInfo) as any) : {};
  }

  async getMembersDocuments(memberId: number, docOwner: string, typeId: number) {
    const pool = db.getConnection("slave");
    let sql = `SELECT document_no, doc_owner, remarks FROM loan.document_info WHERE ref_no = $1
     AND doc_owner = $2 AND doc_type_id = $3 AND is_active = true`;
    let docInfo = await await pool.query(sql, [memberId, docOwner, typeId]);
    return docInfo.rows[0] ? (toCamelKeys(docInfo.rows) as any) : [];
  }

  async getMembersAddress(memberId: number, typeId: number): Promise<any> {
    const pool = db.getConnection("slave");
    let sql = `SELECT district_id, upa_city_id, uni_thana_paw_id, post_code, village, ward_no FROM master.address_info 
                  WHERE ref_no = $1 AND address_type_id = $2`;
    let addressInfo = await await pool.query(sql, [memberId, typeId]);
    return addressInfo.rows[0] ? (toCamelKeys(addressInfo.rows[0]) as any) : {};
  }

  async getSamityMinMax(id: number, status: true | false) {
    let sql;
    const pool = db.getConnection("slave");
    if (status)
      sql = `
        SELECT 
          samity_min_member, 
          samity_max_member, 
          member_min_age,
          member_max_age
        FROM samity.samity_info 
        WHERE id = $1`;
    else
      sql = `
    SELECT 
      data :: json -> 'setup' -> 'samity_min_member' AS samity_min_member, 
      data :: json -> 'setup' -> 'samity_max_member' AS samity_max_member,
      data :: json -> 'setup' -> 'member_min_age' AS member_min_age,
      data :: json -> 'setup' -> 'member_max_age' AS member_max_age
    FROM 
      temps.application 
    WHERE 
      id = $1`;
    const result = (await pool.query(sql, [id])).rows[0];
    return result ? toCamelKeys(result) : [];
  }

  async validateMember(tempId: number, data: any, memberInfo: any) {
    const pool = db.getConnection("slave");

    if (data?.basic?.flag == 2) {
      const tempSamityMember = (await this.getSamityMinMax(tempId, false)) as any;

      let total = parseInt(data?.memberInfo?.length) + parseInt(memberInfo.length);
      if (parseInt(tempSamityMember.samityMaxMember) < total)
        throw new BadRequestError(`সমিতির সর্বোচ্চ সদস্য সংখ্যা ${tempSamityMember.samityMaxMember}`);
      else if (parseInt(tempSamityMember.samityMinMember) > total)
        throw new BadRequestError(`সমিতির সর্বনিম্ন সদস্য সংখ্যা ${tempSamityMember.samityMinMember}`);
      else {
        for (const member of memberInfo) {
          const memberAge = member.data.age;
          if (memberAge < tempSamityMember.memberMinAge)
            throw new BadRequestError(`সদস্যের সর্বনিম্ন বয়স ${tempSamityMember.memberMinAge}`);
          else if (memberAge > tempSamityMember.memberMaxAge)
            throw new BadRequestError(`সদস্যের সর্বোচ্চ বয়স ${tempSamityMember.memberMaxAge}`);
          else continue;
        }
      }
    } else if (data?.basic?.flag == 3 || !data?.basic?.flag) {
      var approveMember;
      let memberMinMax;

      if (memberInfo[0]?.data?.samityId) {
        const approveMemberSql = `SELECT COUNT(*) FROM samity.customer_info WHERE samity_id = $1`;
        approveMember = (await pool.query(approveMemberSql, [memberInfo[0].data.samityId])).rows[0].count;
        memberMinMax = (await this.getSamityMinMax(memberInfo[0].data.samityId, true)) as any;
      } else {
        approveMember = 0;
        memberMinMax = (await this.getSamityMinMax(tempId, false)) as any;
      }
      const tempDataLength = data?.memberInfo?.length ? data.memberInfo.length : 0;
      let totalMember = parseInt(approveMember) + 1 + tempDataLength;
      if (parseInt(memberMinMax.samityMaxMember) < totalMember)
        throw new BadRequestError(`সমিতির সর্বোচ্চ সদস্য সংখ্যা ${memberMinMax.samityMaxMember}`);
      else if (parseInt(memberMinMax.samity_min_member) > totalMember)
        throw new BadRequestError(`সমিতির সর্বনিম্ন সদস্য সংখ্যা ${memberMinMax.samity_min_member}`);
      else if (Number(memberInfo[0]?.data?.age) < Number(memberMinMax.memberMinAge))
        throw new BadRequestError(`সদস্যের সর্বনিম্ন বয়স ${memberMinMax.memberMinAge}`);
      else if (Number(memberInfo[0]?.data?.age) > Number(memberMinMax.memberMaxAge))
        throw new BadRequestError(`সদস্যের সর্বোচ্চ বয়স ${memberMinMax.memberMaxAge}`);
      else return true;
    }
  }

  async validateDol(info: any, dbConnection: Pool | PoolClient) {
    const resultMinMaxSql = `SELECT group_min_member, group_max_member FROM samity.samity_info where id = $1`;
    const resultMinMax: any = (await dbConnection.query(resultMinMaxSql, [info.data.samityId])).rows[0];

    if (resultMinMax.group_max_member > 0 && resultMinMax.group_min_member > 0) {
      if (resultMinMax.group_max_member < info.data.memberId.length)
        throw new BadRequestError(`দলের সর্বোচ্চ সদস্য সংখ্যা ${numberToWord(resultMinMax.group_max_member)}`);
      else if (resultMinMax.group_min_member > info.data.memberId.length)
        throw new BadRequestError(`দলের সর্বনিম্ন সদস্য সংখ্যা ${numberToWord(resultMinMax.group_min_member)}`);
      else return true;
    } else return true;
  }

  //member attendance
  async memberAttendance(data: IMemberAttendanceAttrs): Promise<IMemberAttendanceAttrs> {
    const pool = db.getConnection();
    data.meetingDate = new Date(data.meetingDate as any).toLocaleDateString("en-GB") as any;
    const { sql, params } = buildInsertSql("samity.attendance_info", data);
    const result = await (await pool.query(sql, params)).rows[0];

    return result ? toCamelKeys(result) : [];
  }

  async getLoanAppliedMembers(samityId: number, type: string, doptorId: number) {
    const pool = db.getConnection("slave");
    let sql: string = ``;
    let memberInfo: any;
    if (type == "sanction") {
      if (doptorId == 10) {
        sql = `SELECT 
              id, 
              customer_code, 
              name_bn, 
              name_en, 
              father_name, 
              mother_name, 
              mobile, 
              customer_status 
            FROM 
              samity.customer_info 
              WHERE 
              samity_id = $1 
            ORDER BY 
              id`;
      } else {
        sql = `SELECT 
        id, 
        name_bn || ' (' || customer_code || ')' name_bn 
      FROM 
        samity.customer_info a 
      WHERE 
        a.samity_id = $1 
        AND customer_status = 'ACT' 
        AND a.id NOT IN (
          SELECT 
            b.customer_id 
          FROM 
            loan.global_limit b 
            INNER JOIN loan.account_info c ON b.account_id = c.id 
          WHERE 
            a.samity_id = b.samity_id 
            AND c.account_status = 'ACT' 
          UNION 
          SELECT 
            CAST(data ->> 'customer_id' as integer) customer_id 
          FROM 
            temps.application 
          WHERE 
            service_id = 7 
            AND next_app_designation_id != 0 
            AND samity_id = $1
        ) 
      ORDER BY 
        a.id`;
      }
    } else if (type == "disburse") {
      sql = `SELECT 
              b.id, 
              b.name_bn || ' (' || customer_code || ')' name_bn
            FROM 
              loan.global_limit a 
              INNER JOIN samity.customer_info b ON a.customer_id = b.id 
            WHERE 
              a.samity_id = $1 AND
              a.is_disbursed = false
              ORDER BY id`;
    }
    memberInfo = (await pool.query(sql, [samityId])).rows;
    return memberInfo[0] ? (toCamelKeys(memberInfo) as any) : [];
  }

  async getCustomerLoanInfo(customerId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  a.id,
                  a.doptor_id, 
                  a.office_id, 
                  a.sanction_limit loan_amount, 
                  a.loan_term, 
                  a.installment_frequency, 
                  a.profit_amount service_charge, 
                  a.installment_amount, 
                  a.installment_no, 
                  a.service_charge_rate, 
                  a.product_id,
                  c.product_name,
                  c.is_multiple_disbursement_allow,
                  b.purpose_name, 
                  c.cal_type, 
                  c.grace_period, 
                  c.grace_amt_repay_ins, 
                  c.holiday_effect,
                  c.allow_insurance,
                  c.insurance_percent, 
                  c.installment_amount_method, 
                  c.installment_division_digit,
                  e.return_value meeting_day, 
                  d.week_position,
                  a.disbursed_amount 
                FROM 
                  loan.global_limit a 
                  INNER JOIN master.loan_purpose b ON b.id = a.purpose_id 
                  INNER JOIN loan.product_mst c ON c.id = a.product_id 
                  INNER JOIN samity.samity_info d ON d.id = a.samity_id 
                  INNER JOIN master.code_master e ON e.id = d.meeting_day 
                WHERE 
                  a.customer_id = $1 
                  AND a.is_disbursed = false`;
    let loanInfo = (await pool.query(sql, [customerId])).rows;
    if (!loanInfo[0]) throw new BadRequestError("প্রদত্ত সদস্যের ঋণের তথ্য পাওয়া যায়নি");
    loanInfo = loanInfo[0] ? (toCamelKeys(loanInfo) as any) : loanInfo;

    const serviceCharge = Container.get(ServiceChargeService);
    console.log({
      loanAmount: Number(loanInfo[0]?.loanAmount),
      loanTerm: Number(loanInfo[0].loanTerm),
      serviceChargeRate: Number(loanInfo[0].serviceChargeRate),
      calType: loanInfo[0].calType,
      installmentNo: Number(loanInfo[0].installmentNo),
      installmentFrequency: loanInfo[0].installmentFrequency,
      disbursementDate: moment(new Date()),
      graceAmtRepayIns: loanInfo[0].graceAmtRepayIns ? loanInfo[0].graceAmtRepayIns : "NO",
      gracePeriod: loanInfo[0].gracePeriod,
      meetingDay: loanInfo[0].meetingDay,
      weekPosition: loanInfo[0].weekPosition ? Number(loanInfo[0].weekPosition) : undefined,
      doptorId: loanInfo[0].doptorId ? Number(loanInfo[0].doptorId) : undefined,
      officeId: loanInfo[0].officeId ? Number(loanInfo[0].officeId) : undefined,
      holidayEffect: loanInfo[0].holidayEffect ? loanInfo[0].holidayEffect : undefined,
      installmentAmountMethod: loanInfo[0].installmentAmountMethod ? loanInfo[0].installmentAmountMethod : undefined,
      installmentDivisionDigit: loanInfo[0].installmentDivisionDigit
        ? Number(loanInfo[0].installmentDivisionDigit)
        : undefined,
    });

    const data = await serviceCharge.get(
      Number(loanInfo[0]?.loanAmount),
      Number(loanInfo[0].loanTerm),
      Number(loanInfo[0].serviceChargeRate),
      loanInfo[0].calType,
      Number(loanInfo[0].installmentNo),
      loanInfo[0].installmentFrequency,
      moment(new Date()),
      loanInfo[0].graceAmtRepayIns ? loanInfo[0].graceAmtRepayIns : "NO",
      loanInfo[0].gracePeriod,
      loanInfo[0].meetingDay,
      loanInfo[0].weekPosition ? Number(loanInfo[0].weekPosition) : undefined,
      loanInfo[0].doptorId ? Number(loanInfo[0].doptorId) : undefined,
      loanInfo[0].officeId ? Number(loanInfo[0].officeId) : undefined,
      loanInfo[0].holidayEffect ? loanInfo[0].holidayEffect : undefined,
      loanInfo[0].installmentAmountMethod ? loanInfo[0].installmentAmountMethod : undefined,
      loanInfo[0].installmentDivisionDigit ? Number(loanInfo[0].installmentDivisionDigit) : undefined
    );

    let schedule = data.schedule;

    if (schedule && schedule[0]) loanInfo[0]["schedule"] = schedule;

    return loanInfo[0] ? (toCamelKeys(loanInfo) as any) : [];
  }

  async getCustomerAccountInfo(
    doptorId: number,
    officeId: number,
    projectId: number,
    productId: number,
    samityId: number,
    customerId: number,
    allAccounts: string | undefined
  ) {
    const pool = db.getConnection("slave");
    let sql, loanInfo;
    if (allAccounts && allAccounts == "true") {
      sql = `SELECT 
              DISTINCT a.id account_id, 
              a.account_title, 
              a.account_no, 
              a.alltrn, 
              b.current_balance, 
              b.block_amt,
              c.product_name, 
              c.product_type, 
              c.deposit_nature,
              c.is_default_savings,
			        c.is_default_share 
            FROM 
              loan.account_info a 
              INNER JOIN loan.account_balance b ON b.account_id = a.id 
              INNER JOIN loan.product_mst c ON a.product_id = c.id 
            WHERE 
              a.doptor_id = $1
              AND a.project_id = $2 
              AND a.samity_id = $3 
              AND a.customer_id = $4 
              AND a.account_status = 'ACT'`;
      loanInfo = (await pool.query(sql, [doptorId, projectId, samityId, customerId])).rows as any;
      let nomineeInfoSql, nomineeInfo;
      for (let [index, singleAcc] of loanInfo.entries()) {
        if (singleAcc?.is_default_savings || singleAcc?.is_default_share) {
          nomineeInfoSql = `SELECT 
                              a.nominee_name, 
                              b.display_value relation, 
                              a.percentage 
                            FROM 
                              samity.nominee_info a 
                              INNER JOIN master.code_master b ON b.id = a.relation 
                            WHERE 
                              customer_id = $1 
                              AND account_id IS NULL`;
          nomineeInfo = (await pool.query(nomineeInfoSql, [customerId])).rows;
        } else {
          nomineeInfoSql = `SELECT 
                              a.nominee_name, 
                              b.display_value relation, 
                              a.percentage 
                            FROM 
                              samity.nominee_info a 
                              INNER JOIN master.code_master b ON b.id = a.relation 
                            WHERE 
                              customer_id = $1 
                              AND account_id = $2`;
          nomineeInfo = (await pool.query(nomineeInfoSql, [customerId, singleAcc?.account_id])).rows;
        }
        loanInfo[index] = { ...loanInfo[index], nomineeInfo: nomineeInfo && nomineeInfo.length > 0 ? nomineeInfo : [] };
      }
    } else {
      sql = `SELECT 
              DISTINCT id account_id, 
              account_title, 
              account_no 
            FROM 
              loan.account_info 
            WHERE 
              doptor_id = $1 
              AND office_id = $2 
              AND project_id = $3 
              AND product_id = $4 
              AND samity_id = $5 
              AND customer_id = $6`;
      loanInfo = (await pool.query(sql, [doptorId, officeId, projectId, productId, samityId, customerId])).rows as any;
    }
    return loanInfo[0] ? (toCamelKeys(loanInfo) as any) : [];
  }

  //get product nature wise customer account
  async getProductWiseAccount(
    doptorId: number,
    officeId: number,
    samityId: number,
    customerId: number,
    productNature: string | undefined
  ) {
    const pool = db.getConnection("slave");
    let productWiseAccountSql, productWiseAccountInfo;
    productWiseAccountSql = `SELECT   b.id                                account_id,
                                      b.account_no                        account_no,
                                      b.account_title                     account_title,
                                      a.product_name                      product_name,
                                      COALESCE (c.current_balance, 0)     current_balance,
                                      COALESCE (c.block_amt, 0)           block_amt
                                  FROM loan.product_mst a
                                      INNER JOIN loan.account_info b ON a.id = b.product_id
                                      LEFT JOIN loan.account_balance c
                                          ON b.product_id = c.product_id AND c.account_id = b.id
                                  WHERE   a.doptor_id = $1
                                      AND b.office_id = $2
                                      AND b.samity_id = $3
                                      AND b.customer_id = $4
                                      AND COALESCE (deposit_nature, 'X') = $5
                                      AND COALESCE (b.account_status, 'ACT') = 'ACT'
                              ORDER BY b.id`;
    productWiseAccountInfo = (
      await pool.query(productWiseAccountSql, [doptorId, officeId, samityId, customerId, productNature])
    ).rows as any;

    return productWiseAccountInfo.length > 0 ? toCamelKeys(productWiseAccountInfo) : productWiseAccountInfo;
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }

  async getSamityInfo(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    const pool = db.getConnection("slave");
    var queryText: string = "";
    const sql: string = "SELECT * FROM samity.samity_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];
      var officeData = await pool.query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM samity.samity_info ORDER BY id  LIMIT $1 OFFSET $2"
        : "SELECT * FROM samity.samity_info ORDER BY id ";
      officeData = await pool.query(queryText, isPagination ? [limit, offset] : []);
    }

    return officeData.rows ? toCamelKeys(officeData.rows) : officeData.rows;
  }

  async count(allQuery: object, tableName: string) {
    const pool = db.getConnection("slave");
    var queryText: string = "";
    const sql: string = `SELECT COUNT(id) FROM ${tableName}`;
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await pool.query(queryText, allQueryValues);
    } else {
      queryText = `SELECT COUNT(id) FROM ${tableName}`;
      result = await pool.query(queryText);
    }
    return result.rows[0].count;
  }

  async getCount(page: number, limit: number, allQuery: any, pagination: any | null, tableName: string) {
    const isPagination = pagination && pagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;
    const count: number = await this.count(allQuery, tableName);
    return count;
  }

  async memberNidUniqueCheck(member: any): Promise<Boolean> {
    const pool = db.getConnection("slave");
    let status = true;
    for (let value of member) {
      for (let memberDoc of value.data.memberDocuments) {
        if (memberDoc.documentNumber && memberDoc.documentType) {
          const sql = `SELECT COUNT(*) FROM loan.document_info WHERE document_no = $1`;
          const result = (await pool.query(sql, [memberDoc.documentNumber])).rows[0].count;
          if (result && Number(result) > 0) {
            status = false;
            return status;
          } else continue;
        }
      }
    }
    return status;
  }

  async getSamityForSync(
    dbConnection: Pool | PoolClient,
    doptorId?: number,
    officeId?: number | String,
    componentName?: String
  ) {
    const tableName = componentName === `coop` ? `coop.samity_info` : `samity.samity_info`;
    let queryText = ``;
    let values: any[] = [];
    if (doptorId && officeId && officeId != "ALL") {
      queryText = `select * from ${tableName} WHERE  doptor_id = $1 and office_id = $2`;
      values = [doptorId, officeId];
    } else if (!doptorId && !officeId) {
      queryText = `select * from ${tableName} WHERE created_at > dashboard_sync or dashboard_sync is null or updated_at > dashboard_sync`;
      values = [];
    } else if (officeId == "ALL") {
      queryText = `select * from ${tableName} WHERE  doptor_id = $1`;
      values = [doptorId];
    }
    const data = (await dbConnection.query(queryText, values)).rows;
    const samityInfo: any[] = [];
    if (data.length) {
      for await (const d of data) {
        let members: any = [];
        if (componentName == "coop") {
          members = await this.getMemberList(d.id, 3, true, undefined);
          console.log({ members });
          console.log("***********************************************************");
        } else {
          members = await this.getMemberList(d.id, 1, true, undefined);
        }
        samityInfo.push({ ...d, members });
      }
    }

    return toCamelKeys(samityInfo);
  }

  async getCustomerFinancialInfo(originSamityId: number) {
    const pool = db.getConnection("slave");
    const samitySql = `SELECT 										
                          *
                        FROM
                          samity.samity_info
                        WHERE
                          origin_samity_id = $1`;
    let samityInfo = (await pool.query(samitySql, [originSamityId])).rows[0];
    if (!samityInfo) throw new BadRequestError("সমিতিটি খুঁজে পাওয়া যায়নি");

    const memberSql = `SELECT 										
                        *
                      FROM
                        samity.customer_info
                      WHERE
                        samity_id = $1`;
    let memberInfo = (await pool.query(memberSql, [samityInfo.id])).rows;
    if (!memberInfo || !memberInfo[0]) throw new BadRequestError("সমিতিটিতে কোন সদস্য বিদ্যমান নেই");

    const memberFinancialInfoSql = `SELECT 
                                      e.project_name_bangla, 
                                      b.product_name, 
                                      a.account_no, 
                                      a.account_status, 
                                      a.close_date, 
                                      c.sanction_limit loan_amount, 
                                      c.sanction_date, 
                                      c.disbursed_date, 
                                      c.profit_amount service_charge, 
                                      f.id loan_purpose_id, 
                                      f.purpose_name, 
                                      SUM(principal_amount):: INTEGER loan_amount, 
                                      SUM(interest_amount):: INTEGER interest_amount, 
                                      COALESCE(
                                        SUM(principal_paid_amount), 
                                        0
                                      ):: INTEGER principal_paid_amount, 
                                      COALESCE(
                                        SUM(interest_paid_amount), 
                                        0
                                      ):: INTEGER interest_paid_amount, 
                                      (
                                        SUM(principal_amount)- COALESCE(
                                          SUM(principal_paid_amount), 
                                          0
                                        )
                                      ):: INTEGER due_principal, 
                                      (
                                        SUM(interest_amount)- COALESCE(
                                          SUM(interest_paid_amount), 
                                          0
                                        )
                                      ):: INTEGER due_interest, 
                                      SUM(interest_rebate_amount):: INTEGER interest_rebate_amount, 
                                      (
                                        (
                                          SUM(principal_amount)- COALESCE(
                                            SUM(principal_paid_amount), 
                                            0
                                          )
                                        )+(
                                          SUM(interest_amount)- COALESCE(
                                            SUM(interest_paid_amount), 
                                            0
                                          )
                                        )
                                      ):: INTEGER total_due_amount 
                                    FROM 
                                      loan.account_info a 
                                      INNER JOIN loan.product_mst b ON b.id = a.product_id 
                                      INNER JOIN loan.global_limit c ON c.account_id = a.id 
                                      INNER JOIN loan.schedule_info d ON d.account_id = a.id 
                                      INNER JOIN master.project_info e ON e.id = c.project_id 
                                      INNER JOIN master.loan_purpose f ON f.id = c.purpose_id 
                                    WHERE 
                                      a.samity_id = $1 
                                      AND a.customer_id = $2 
                                    GROUP BY 
                                      product_name, 
                                      account_no, 
                                      account_status, 
                                      close_date, 
                                      sanction_limit, 
                                      sanction_date, 
                                      disbursed_date, 
                                      profit_amount, 
                                      project_name_bangla, 
                                      loan_purpose_id, 
                                      purpose_name`;

    for (let [index, singleMember] of memberInfo.entries()) {
      let memberFinancialInfo = (await pool.query(memberFinancialInfoSql, [samityInfo.id, singleMember.id])).rows;
      memberInfo[index] = {
        ...memberInfo[index],
        memberFinancialInfo: memberFinancialInfo && memberFinancialInfo[0] ? memberFinancialInfo : [],
      };
    }
    samityInfo = { ...samityInfo, memberInfo };
    return samityInfo ? toCamelKeys(samityInfo) : {};
  }

  async getCustomerDueLoanAmount(accountId: number) {
    const pool = db.getConnection("slave");
    const getAdvancePayBenefitSql = `SELECT 
                                        b.id product_id,
                                        b.product_name,
                                        b.is_adv_pay_benefit 
                                      FROM 
                                        loan.account_info a 
                                        INNER JOIN loan.product_mst b ON b.id = a.product_id 
                                      WHERE 
                                        a.id = $1`;
    const productInfo = (await pool.query(getAdvancePayBenefitSql, [accountId])).rows[0];
    const transactionService: TransactionService = Container.get(TransactionService);

    const repaymentTranService: RepaymentTranService = Container.get(RepaymentTranService);
    let loanDueAmountInfo = await repaymentTranService.customerLoanAccountChecking(
      accountId,
      productInfo.is_adv_pay_benefit as boolean,
      pool
    );

    const otherLoanAmountInfoSql = `SELECT 
                                      SUM(principal_amount):: INTEGER loan_amount, 
                                      SUM(interest_amount):: INTEGER interest_amount, 
                                      COALESCE(
                                        SUM(principal_paid_amount), 
                                        0
                                      ):: INTEGER principal_paid_amount, 
                                      COALESCE(
                                        SUM(interest_paid_amount), 
                                        0
                                      ):: INTEGER interest_paid_amount, 
                                      (
                                        SUM(principal_amount)- COALESCE(
                                          SUM(principal_paid_amount), 
                                          0
                                        )
                                      ):: INTEGER due_principal, 
                                      (
                                        SUM(interest_amount)- COALESCE(
                                          SUM(interest_paid_amount), 
                                          0
                                        )
                                      ):: INTEGER due_interest, 
                                      SUM(interest_rebate_amount):: INTEGER interest_rebate_amount, 
                                      (
                                        (
                                          SUM(principal_amount)- COALESCE(
                                            SUM(principal_paid_amount), 
                                            0
                                          )
                                        )+(
                                          SUM(interest_amount)- COALESCE(
                                            SUM(interest_paid_amount), 
                                            0
                                          )
                                        )
                                      ):: INTEGER total_amount 
                                    FROM 
                                      loan.schedule_info 
                                    WHERE 
                                      account_id = $1`;
    const otherLoanAmountInfo = (await pool.query(otherLoanAmountInfoSql, [accountId])).rows[0];
    loanDueAmountInfo = {
      ...loanDueAmountInfo,
      ...otherLoanAmountInfo,
      productName: productInfo.product_name,
      productId: productInfo.product_id,
    };
    return loanDueAmountInfo ? toCamelKeys(loanDueAmountInfo) : {};
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async withdrawInstructionValidate(accountId: number, withdrawAmount: number, dbConnection: Pool | PoolClient) {
    const withdrawInstructionSql = `SELECT 
    a.withdraw_instruction,
    a.account_status, 
    b.current_balance, 
    b.block_amt
  FROM 
    loan.account_info a 
    INNER JOIN loan.account_balance b ON b.account_id = a.id 
  WHERE 
    a.id = $1`;
    const withdrawInstructionInfo = (await dbConnection.query(withdrawInstructionSql, [accountId])).rows[0];
    if (withdrawInstructionInfo?.account_status != "ACT") throw new BadRequestError(`সদস্যের অ্যাকাউন্টটি সচল নয়`);
    else {
      const availableAmount: number =
        Number(withdrawInstructionInfo?.current_balance) - Number(withdrawInstructionInfo?.block_amt);
      if (availableAmount < Number(withdrawAmount))
        throw new BadRequestError(`সদস্যের অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই`);
      else if (withdrawInstructionInfo && withdrawInstructionInfo == "N")
        throw new BadRequestError(`প্রদত্ত অ্যাকাউন্ট থেকে টাকা উত্তোলনের অনুমতি নেই`);
      else return true;
    }
  }
}
