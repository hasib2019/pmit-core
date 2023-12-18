import { toCamelKeys, toSnakeCase } from "keys-transform";
import { Pool, PoolClient } from "pg";
import { BadRequestError, buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export default class DataService {
  constructor() {}

  async getCodeMasterData(codeType: string, returnType?: string) {
    const pool = db.getConnection("slave");
    let sql: string;
    let codeInfo: any;
    if (returnType) {
      sql = `SELECT id, INITCAP(display_value) as display_value, code_type FROM master.code_master
                WHERE code_type = $1 AND return_value = $2 AND is_active = true`;
      codeInfo = (await pool.query(sql, [codeType, returnType])).rows;
    } else {
      sql = `SELECT id, INITCAP(display_value) as display_value, return_value, code_type FROM master.code_master
                WHERE code_type = $1 AND is_active = true`;
      codeInfo = (await pool.query(sql, [codeType])).rows;
    }

    return codeInfo.length > 0 ? (toCamelKeys(codeInfo) as any) : [];
  }

  async getDocTypes() {
    const pool = db.getConnection("slave");
    const sql = `SELECT id, doc_type, doc_type_desc FROM master.document_type WHERE is_active = true ORDER BY id`;
    const docTypeInfo = await (await pool.query(sql)).rows;
    return docTypeInfo.length > 0 ? (toCamelKeys(docTypeInfo) as any) : [];
  }

  async getDocTypeId(doctype: string, transaction: PoolClient | Pool) {
    const sql = `SELECT id FROM master.document_type WHERE doc_type = $1`;
    const docTypeId = await (await transaction.query(sql, [doctype])).rows[0]?.id;
    return docTypeId ? (docTypeId as any) : null;
  }

  async getFieldsData(pageName: string, doptorId: number, project: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT b.samity_type, a.field_name, a.is_active, label_name 
                    FROM master.field_status as a, 
                    master.project_info as b 
                    WHERE a.project_id = b.id AND 
                    a.page_name = $1 AND 
                    a.doptor_id = $2 AND 
                    a.project_id = $3`;
    const fieldInfo: any = (await pool.query(sql, [pageName, doptorId, project])).rows;
    let finalFieldStatus: any = {};
    let finalFieldLabel: any = {};
    for (const [i, v] of fieldInfo.entries()) {
      finalFieldStatus[v.field_name.toString()] = v.is_active;
      finalFieldLabel[v.field_name.toString()] = fieldInfo[i].label_name;
    }
    if (fieldInfo[0]) finalFieldStatus.samity_type = fieldInfo[0].samity_type;
    return Object.keys(finalFieldStatus).length > 0
      ? (toCamelKeys([finalFieldStatus, finalFieldLabel]) as any)
      : [{}, {}];
  }

  //get permitted division office
  async getDivisionOffice(officeId: number, officeLayer: number) {
    const pool = db.getConnection("slave");
    let sql1: string;
    let sql2: string;
    let sql3: string;
    let officeInfo: any;
    if (officeLayer == 5) {
      sql1 = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE layer_id = 5 AND id = $1`;
      officeInfo = await (await pool.query(sql1, [officeId])).rows;
    } else if (officeLayer == 3) {
      sql1 = `SELECT id, parent_id, division_id, district_id, upazila_id FROM master.mv_level_wise_office  WHERE layer_id = 3 AND id = $1`;
      const districtOfficeInfo = await (await pool.query(sql1, [officeId])).rows;
      sql2 = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE layer_id = 5 AND id = $1`;
      officeInfo = await (await pool.query(sql2, [districtOfficeInfo[0].parent_id])).rows;
    } else if (officeLayer == 6) {
      sql1 = `SELECT id, division_id, district_id, upazila_id, parent_id FROM master.mv_level_wise_office  WHERE layer_id = 6 AND id = $1`;
      const upazilaOfficeInfo = await (await pool.query(sql1, [officeId])).rows;
      sql2 = `SELECT id, division_id, district_id, upazila_id, parent_id FROM master.mv_level_wise_office  WHERE layer_id = 3 AND id = $1`;
      const districtOfficeInfo = await (await pool.query(sql2, [upazilaOfficeInfo[0].parent_id])).rows;
      sql3 = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE layer_id = 5 AND id = $1`;
      officeInfo = await (await pool.query(sql3, [districtOfficeInfo[0].parent_id])).rows;
    } else officeInfo = [];

    return officeInfo.length > 0 ? (toCamelKeys(officeInfo) as any) : [];
  }

  //get permitted district office
  async getDistrictOffice(officeId: number, officeLayer: number) {
    const pool = db.getConnection("slave");
    let sql: string;
    let officeInfo: any;
    if (officeLayer == 3) {
      sql = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE layer_id = $1 AND id = $2`;
      officeInfo = (await pool.query(sql, [officeLayer, officeId])).rows;
    } else if (officeLayer == 6) {
      sql = `SELECT id, parent_id, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE layer_id = 6 AND id = $1`;
      const upazilaOfficeInfo = (await pool.query(sql, [officeId])).rows;
      sql = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE id = $1`;
      officeInfo = (await pool.query(sql, [upazilaOfficeInfo[0].parent_id])).rows;
    } else if (officeLayer == 5) {
      sql = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                WHERE layer_id = $1 AND parent_id = $2`;
      officeInfo = (await pool.query(sql, [officeLayer, officeId])).rows;
    } else if (officeLayer == 12) {
      sql = `SELECT parent_id, id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
      WHERE id = $1`;
      let officeInfoId = (await pool.query(sql, [officeId])).rows[0]?.parent_id;
      let finalSql = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
      WHERE id = $1`;
      officeInfo = (await pool.query(finalSql, [officeInfoId])).rows;
    } else officeInfo = [];

    return officeInfo.length > 0 ? (toCamelKeys(officeInfo) as any) : [];
  }

  //get permitted district office
  async getUpazilaOffice(officeId: number, officeLayer: number, districtOfficeId: any) {
    const pool = db.getConnection("slave");
    let sql1: string;
    let sql2: string;
    let officeInfo: any;
    if (districtOfficeId) {
      sql1 = `SELECT a.id, a.office_name_bangla, a.division_id, a.district_id, a.upazila_id, b.upa_city_type FROM master.mv_level_wise_office a
      INNER JOIN master.mv_upazila_city_info b ON b.upa_city_id = a.upazila_id
                        WHERE parent_id = $1`;
      officeInfo = await (await pool.query(sql1, [districtOfficeId])).rows;
      let allOfficeIds = officeInfo.map((value: any) => value.id);
      if (allOfficeIds.includes(officeId)) officeInfo = officeInfo.filter((value: any) => value.id == officeId);
    } else {
      console.log("hiElse");
      if (officeLayer == 6 || officeLayer == 3 || officeLayer == 12) {
        console.log("hiElseIf1");
        sql1 = `SELECT a.id, a.office_name_bangla, a.division_id, a.district_id, a.upazila_id, b.upa_city_type FROM master.mv_level_wise_office a
        INNER JOIN master.mv_upazila_city_info b ON b.upa_city_id = a.upazila_id
                          WHERE layer_id = 6 AND id = $1`;
        officeInfo = await (await pool.query(sql1, [officeId])).rows;
      } else if (officeLayer == 5) {
        console.log("hiElseIf2");
        sql1 = `SELECT id, parent_id, division_id, district_id, upazila_id FROM master.mv_level_wise_office 
                  WHERE layer_id = 6 AND parent_id = $1`;
        let districtOfficeInfo = await (await pool.query(sql1, [officeId])).rows;
        sql2 = `SELECT id, office_name_bangla, division_id, district_id, upazila_id FROM master.mv_level_wise_office
                  WHERE layer_id = 6 AND parent_id = $1`;
        officeInfo = await (await pool.query(sql2, [districtOfficeInfo[0].parent_id])).rows;
      } else officeInfo = [];
    }

    return officeInfo.length > 0 ? (toCamelKeys(officeInfo) as any) : [];
  }

  //get doptor info
  async getDoptorDetails(doptorId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT id , name_en, name_bn FROM master.doptor_info 
                  WHERE id = $1`;
    const result = await (await pool.query(sql, [doptorId])).rows;
    return result.length > 0 ? (toCamelKeys(result) as any) : [];
  }

  async getOfficeOrigin(doptorId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT * from master.office_origin`;
    const result = await (await pool.query(sql)).rows;
    return result.length > 0 ? (toCamelKeys(result) as any) : [];
  }

  async getOfficeInfo(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    const pool = db.getConnection("slave");
    var queryText: string = "";
    const sql: string = "SELECT * FROM master.office_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);

      const queryText = isPagination ? createSql[0] : createSql[1];
      var officeData = await pool.query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM master.office_info ORDER BY id  LIMIT $1 OFFSET $2"
        : "SELECT * FROM master.office_info ORDER BY id ";
      officeData = await pool.query(queryText, isPagination ? [limit, offset] : []);
    }

    return officeData.rows;
  }

  async getEmployeeRecordByOffice(officeId: number, employeeId: number) {
    const pool = db.getConnection("slave");
    const queryText = `select
                        a.id designation_id,
                        a.name_bn designation,
                        c.id employee_id,
                        COALESCE(c.name_bn, '') name_bn
                      from
                        master.office_designation a
                      inner join master.office_info b on
                        b.id = a.office_id
                      inner join master.office_employee c on
                        a.id = c.designation_id
                      where
                        b.id = $1`;

    const result = (await pool.query(queryText, [officeId])).rows;
    const employeeData = result.filter((item) => item.employee_id != employeeId);
    return result ? toCamelKeys(employeeData) : [];
  }
  async getEmployeeRecordByOfficeForInventory(officeId: number | undefined, employeeId: number | undefined) {
    const pool = db.getConnection("slave");
    if (officeId && employeeId) {
      const queryText = `select
  a.id designation_id,
  a.name_bn designation,
  c.id employee_id,
  c.name_bn
from
  master.office_designation a
inner join master.office_info b on
  b.id = a.office_id
inner join master.office_employee c on
  a.id = c.designation_id
where
  b.id = $1`;

      const result = (await pool.query(queryText, [officeId])).rows;
      const employeeData = result.filter((item) => item.employee_id != employeeId);
      return result ? toCamelKeys(employeeData) : [];
    } else {
      const queryText = `select
      a.id designation_id,
      a.name_bn designation,
      c.id employee_id,
      c.name_bn
    from
      master.office_designation a
    inner join master.office_info b on
      b.id = a.office_id
      inner join master.office_employee c on
      a.id = c.designation_id
    `;

      const result = (await pool.query(queryText)).rows;
      const employeeData = result.filter((item) => item.employee_id != employeeId);
      return result ? toCamelKeys(employeeData) : [];
    }
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

  async getMeetingType(doptorId: number, projectId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT id, type_name FROM master.meeting_type 
                  WHERE doptor_id = $1 AND project_id = $2 AND is_active = true`;
    const meetingtypes = await (await pool.query(sql, [doptorId, projectId])).rows;

    return meetingtypes[0] ? toCamelKeys(meetingtypes) : [];
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async getFacilitatorByOffice(officeId: number, userId: number, allEmployeeStatus: boolean) {
    const pool = db.getConnection("slave");
    let result = [];
    if (allEmployeeStatus) {
      const fieldOfficersSql = `SELECT 
                                  a.id, 
                                  a.employee_id,
                                  b.name_bn 
                                FROM 
                                  samity.field_officer_info a 
                                  INNER JOIN master.office_employee b ON b.id = a.employee_id 
                                WHERE 
                                  a.office_id = $1
                                  AND a.is_active = true`;
      const fieldOfficers = (await pool.query(fieldOfficersSql, [officeId])).rows;
      const allEmployeeSql = `SELECT 
                                a.id employee_id, 
                                a.name_bn as employee_name, 
                                b.id designation_id, 
                                b.name_bn designation_bn,
                                c.id,
								                c.name_bn office_name
                              FROM 
                                master.office_employee a 
                                INNER JOIN master.office_designation b ON b.id = a.designation_id
                                INNER JOIN master.office_info c ON c.id = b.office_id 
                              WHERE 
                                b.office_id = $1 
                                AND a.id != $2`;
      const allEmployee = (await pool.query(allEmployeeSql, [officeId, userId])).rows;

      const fieldOfficersIds = fieldOfficers.map((value: any) => value.employee_id);

      allEmployee.map((singleFieldOfficer: any, index: number) => {
        if (fieldOfficersIds.includes(singleFieldOfficer.employee_id))
          allEmployee[index] = { ...singleFieldOfficer, foStatus: true };
        else allEmployee[index] = { ...singleFieldOfficer, foStatus: false };
      });
      result = allEmployee;
    } else {
      const sql = `SELECT 
                    a.id employee_id, 
                    a.name_bn as employee_name, 
                    b.id designation_id, 
                    b.name_bn designation_bn,
                    c.id,
                    c.name_bn office_name
                  FROM 
                    master.office_employee a 
                    INNER JOIN master.office_designation b ON b.id = a.designation_id
                    INNER JOIN master.office_info c ON c.id = b.office_id 
                  WHERE 
                    b.office_id = $1 
                    AND a.id != $2
                    AND a.id NOT IN(
                      SELECT 
                        employee_id 
                      FROM 
                        samity.field_officer_info 
                      WHERE 
                        office_id = $1
                    )`;
      result = (await pool.query(sql, [officeId, userId])).rows;
    }

    return result.length > 0 ? toCamelKeys(result) : [];
  }

  async getBankInfo(
    type: string,
    doptorId: number,
    officeId: number,
    projectId?: number | null,
    bankId?: number | null
  ) {
    const pool = db.getConnection("slave");
    let sql: string = "";
    let bankInfo: any;
    if (type === "bank") {
      sql = `SELECT id,bank_name FROM master.bank_info WHERE is_active=true ORDER BY id`;
      bankInfo = await (await pool.query(sql)).rows;
    } else if (type === "branch") {
      sql = `
        SELECT
          b.id,
          b.branch_name
        FROM
          master.bank_info a
        INNER JOIN master.branch_info b on
          a.id = b.bank_id
        WHERE
          b.is_active = true
          AND b.bank_id = $1
        ORDER BY
          b.id`;
      bankInfo = await (await pool.query(sql, [bankId])).rows;
    } else if (type === "account") {
      sql = `
        SELECT
          b.bank_id,
          b.branch_id,
          b.account_no
        FROM
          master.branch_info a
        INNER JOIN loan.office_wise_account b ON
          a.bank_id = b.bank_id
          AND a.id = b.branch_id
        WHERE
          b.is_active = true
          AND b.doptor_id = $1
          AND b.project_id = $2
          AND b.office_id = $3
        ORDER BY
          b.id`;
      bankInfo = await (await pool.query(sql, [doptorId, projectId, officeId])).rows;
      if (bankInfo.length <= 0) throw new BadRequestError(`ব্যাংকের তথ্য পাওয়া যাইনি`);
    }

    return bankInfo.length > 0 ? (toCamelKeys(bankInfo) as any) : [];
  }

  async getServiceWiseDocs(doptorId: number, projectId: number, serviceId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  service_rules 
                FROM 
                  master.service_wise_doc_mapping
                WHERE 
                  doptor_id = $1
                  AND project_id = $2
                  AND service_id = $3`;
    let result = (await pool.query(sql, [doptorId, projectId, serviceId])).rows[0]?.service_rules;
    result = result ? toCamelKeys(result) : result;
    const docTypeDetailsSql = `SELECT document_properties FROM master.document_type WHERE id = $1`;
    if (serviceId == 14) {
      for (let [memberDocIndex, singleMemberDoc] of result.memberDocs.entries()) {
        let memberDocumentProperties = (await pool.query(docTypeDetailsSql, [singleMemberDoc.docTypeId])).rows[0]
          ?.document_properties;
        memberDocumentProperties = memberDocumentProperties
          ? toCamelKeys(memberDocumentProperties)
          : memberDocumentProperties;
        result.memberDocs[memberDocIndex] = { ...result.memberDocs[memberDocIndex], ...memberDocumentProperties };
      }
      if (result?.nomineeDocs) {
        for (let [nomineeDocIndex, singleNomineeDoc] of result.nomineeDocs.entries()) {
          let nomineeDocumentProperties = (await pool.query(docTypeDetailsSql, [singleNomineeDoc.docTypeId])).rows[0]
            ?.document_properties;
          nomineeDocumentProperties = nomineeDocumentProperties
            ? toCamelKeys(nomineeDocumentProperties)
            : nomineeDocumentProperties;
          result.nomineeDocs[nomineeDocIndex] = {
            ...result.nomineeDocs[nomineeDocIndex],
            ...nomineeDocumentProperties,
          };
        }
      }
    }
    return result ? toCamelKeys(result) : {};
  }

  async getOfficeLayer(doptorId: number, layerId?: number) {
    const pool = db.getConnection("slave");
    let sql, officeLayerInfo;
    if (layerId) {
      sql = `WITH RECURSIVE office_data AS (
              SELECT 
                id, 
                parent_id_two -> $1 parent_id_two, 
                name_bn 
              FROM 
                master.office_layer 
              WHERE 
                id = $2 
              UNION 
              SELECT 
                a.id, 
                a.parent_id_two -> $1 parent_id_two, 
                a.name_bn 
              FROM 
                master.office_layer a 
                INNER JOIN office_data b ON b.id = CAST(a.parent_id_two -> $1 as integer)
            ) 
            SELECT 
              * 
            FROM 
              office_data 
            order by 
            parent_id_two -> $1`;
      officeLayerInfo = (await pool.query(sql, [doptorId, layerId])).rows;
    } else {
      sql = `SELECT 
              id, 
              name_bn 
            FROM 
              master.office_layer 
            WHERE 
              id in (
                SELECT 
                  DISTINCT layer_id 
                FROM 
                  master.office_info 
                WHERE 
                  doptor_id = $1
              )`;
      officeLayerInfo = (await pool.query(sql, [doptorId])).rows;
    }

    return officeLayerInfo.length > 0 ? (toCamelKeys(officeLayerInfo) as any) : [];
  }
}
