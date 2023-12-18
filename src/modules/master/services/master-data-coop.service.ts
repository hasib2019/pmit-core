/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-01-11 10:12:31
 * @modify date 2022-01-11 10:12:31
 * @desc [description]
 */

import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { buildGetSql, buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import { MasterDataAttrs } from "../interfaces/master-data.interface";
import { masterApprovalDataType } from "../types/master-approval-data-type";
import { masterDataInfo } from "../types/master-data.type";

@Service()
export class MasterDataServices {
  constructor() {}

  async getAll() {
    const masterDataSql = buildGetSql(["*"], "master.code_master");

    const connection = await pgConnect.getConnection("slave");

    const { rows: masterData } = await connection.query(masterDataSql.queryText, masterDataSql.values);

    return toCamelKeys(masterData) as Array<object>;
  }

  async get(
    dataType: MasterDataAttrs,
    type: string,
    limit: number,
    offset: number,
    allQuery: object,
    isPagination: boolean
  ) {
    if (!Object.keys(masterDataInfo).includes(dataType)) return [];

    const tableName = this.getTableName(dataType, type);
    const filterValue = this.getFilter(dataType, type);
    const primaryKey = this.getPrimaryKey(dataType, type);

    if (!tableName) return [];

    const sql: string = `SELECT * FROM master.${tableName}`;

    const filterFields = { ...allQuery, ...filterValue };
    const allQueryValues: any[] = Object.values(filterFields);

    const createSql = buildSql(sql, filterFields, "AND", this.filter, primaryKey, limit, offset);

    const queryText = isPagination ? createSql[0] : createSql[1];

    var docType = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);

    return docType.rows;
  }

  /**
   * @param  {object} allQuery
   */
  async count(dataType: MasterDataAttrs, type: string, allQuery: object) {
    if (!Object.keys(masterDataInfo).includes(dataType)) return 0;

    const tableName = this.getTableName(dataType, type);
    const filterValue = this.getFilter(dataType, type);
    const primaryKey = this.getPrimaryKey(dataType, type);

    const sql: string = `SELECT COUNT(${primaryKey}) FROM master.${tableName}`;

    const filterFields = { ...allQuery, ...filterValue };
    const allQueryValues: any[] = Object.values(filterFields);

    const queryText = buildSql(sql, filterFields, "AND", this.filter, primaryKey)[1];

    var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);

    return result.rows[0].count;
  }

  async getAprrovalDataType(dataType: string, query: any) {
    if (dataType == "employee-record") {
      // const queryText = `select
      //                     a.id designation_id,
      //                     a.name_bn designation,
      //                     c.id employee_id,
      //                     c.name_bn
      //                   from
      //                     master.office_designation a
      //                   inner join master.office_info b on
      //                     b.id = a.office_id
      //                   inner join master.office_employee c on
      //                     a.id = c.designation_id
      //                   where
      //                     b.id = $1
      //                     order by a.is_office_head DESC`;
      const queryText = `SELECT A.ID DESIGNATION_ID,
      A.IS_OFFICE_HEAD,
      A.NAME_BN DESIGNATION,
      C.ID EMPLOYEE_ID,
      C.NAME_BN
    FROM MASTER.OFFICE_DESIGNATION A
    INNER JOIN MASTER.OFFICE_INFO B ON B.ID = A.OFFICE_ID
    INNER JOIN MASTER.OFFICE_EMPLOYEE C ON A.ID = C.DESIGNATION_ID
    WHERE B.ID = $1
    ORDER BY A.IS_OFFICE_HEAD DESC`;

      const result = (await (await pgConnect.getConnection("slave")).query(queryText, [query.office])).rows;

      return result ? toCamelKeys(result) : [];
    } else {
      const type: any = masterApprovalDataType[dataType];
      const { queryText, values } = buildGetSql(type.fields, type.tableName, query);

      const result = (await (await pgConnect.getConnection("slave")).query(queryText, values)).rows;

      return result ? toCamelKeys(result) : [];
    }
  }

  getTableName(dataType: string, type: string) {
    const path = (dataType === "geo-code" ? `geo-code.${type}` : dataType) + ".tableName";

    return _.get(masterDataInfo, path);
  }

  getFilter(dataType: string, type: string) {
    const path = (dataType === "geo-code" ? `geo-code.${type}` : dataType) + ".filters";

    return toCamelKeys(_.get(masterDataInfo, path)) as object;
  }

  getPrimaryKey(dataType: string, type: string) {
    const path = (dataType === "geo-code" ? `geo-code.${type}` : dataType) + ".primaryKey";

    return _.get(masterDataInfo, path);
  }

  /**
   * @param  {string} key
   */
  filter(key: string) {
    return toSnakeCase(key);
  }

  async getDistrictOffice(officeId: number, officeLayer: number, doptorId: number): Promise<any> {
    const pool = await pgConnect.getConnection("slave");

    let sql: string;
    let officeInfo: any;
    if (officeLayer == 3) {
      sql = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                WHERE layer_id = 3 AND id = $1`;
      officeInfo = await (await pool.query(sql, [officeId])).rows;
    } else if (officeLayer == 6) {
      sql = `SELECT id, parent_id FROM master.mv_level_wise_office
                WHERE layer_id = 6 AND id = $1`;
      const upazilaOfficeInfo = await (await pool.query(sql, [officeId])).rows;
      sql = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                WHERE id = $1`;
      officeInfo = await (await pool.query(sql, [upazilaOfficeInfo[0].parent_id])).rows;
    } else if (officeLayer == 5) {
      sql = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                WHERE layer_id = 3 AND parent_id = $1`;
      officeInfo = await (await pool.query(sql, [officeId])).rows;
    } else {
      sql = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
      WHERE layer_id = 3 AND doptor_id= $1`;
      officeInfo = await (await pool.query(sql, [doptorId])).rows;
    }

    return officeInfo.length > 0 ? (toCamelKeys(officeInfo) as any) : [];
  }

  async getUpazilaOffice(officeId: number, officeLayer: number, districtOfficeId: any, user?: any): Promise<any> {
    const pool = await pgConnect.getConnection("slave");
    let sql1: string;
    let sql2: string;
    let officeInfo: any;
    if (districtOfficeId) {
      sql1 = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                  WHERE layer_id = 6 AND parent_id = $1`;
      officeInfo = await (await pool.query(sql1, [districtOfficeId])).rows;
      if (officeLayer == 6) {
        officeInfo = officeInfo.filter((e: any) => e.id == user.officeId);
      }
    } else {
      if (officeLayer == 6) {
        sql1 = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                  WHERE layer_id = 6 AND id = $1`;
        officeInfo = await (await pool.query(sql1, [officeId])).rows;
      } else if (officeLayer == 3) {
        sql1 = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                  WHERE layer_id = 6 AND parent_id = $1`;
        officeInfo = await (await pool.query(sql1, [officeId])).rows;
      } else if (officeLayer == 5) {
        sql1 = `SELECT id, parent_id FROM master.mv_level_wise_office 
                  WHERE layer_id = 6 AND parent_id = $1`;
        let districtOfficeInfo = await (await pool.query(sql1, [officeId])).rows;
        sql2 = `SELECT id, office_name_bangla, division_id FROM master.mv_level_wise_office
                  WHERE layer_id = 6 AND parent_id = $1`;
        officeInfo = await (await pool.query(sql2, [districtOfficeInfo[0].parent_id])).rows;
      } else officeInfo = [];
    }

    return officeInfo.length > 0 ? (toCamelKeys(officeInfo) as any) : [];
  }

  async getUserDoptorInfo(doptorId: number) {
    const sql = `select * from master.doptor_info where id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [doptorId])).rows[0];
    return result ? toCamelKeys(result) : result;
  }

  async getDoptorList(doptorId: number, componentId: number) {
    const pool = await pgConnect.getConnection("slave");
    const getDoptorSql = `WITH RECURSIVE doptor_data AS (
      SELECT id, name_bn
      FROM master.doptor_info
      WHERE id = $1 AND components @> CAST(ARRAY[$2] as int[])
      
      UNION
      
      SELECT a.id, a.name_bn
      FROM master.doptor_info a
      INNER JOIN doptor_data b ON b.id = a.parent_id AND components @> CAST(ARRAY[$2] as int[])
  )
  SELECT *
  FROM doptor_data
  ORDER BY id`;
    const doptorData = (await pool.query(getDoptorSql, [doptorId, componentId])).rows;
    return doptorData.length > 0 ? toCamelKeys(doptorData) : [];
  }

  async getOfficeLayer(doptorId: number, layerId?: number) {
    const pool = await pgConnect.getConnection("slave");
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
              id`;
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
    // const pool = await pgConnect.getConnection("slave");
    // const sql = `SELECT id,name_bn FROM master.office_layer WHERE id in (SELECT DISTINCT layer_id FROM master.office_info WHERE doptor_id = $1)`;
    // const officeLayerInfo = (await pool.query(sql, [doptorId])).rows;
    // return officeLayerInfo.length > 0 ? (toCamelKeys(officeLayerInfo) as any) : [];
  }

  async getChildOffice(doptorId: number, officeId: number, layerId?: number): Promise<any> {
    const pool = await pgConnect.getConnection("slave");
    let sql;
    let result;
    if (layerId) {
      sql = `WITH
      RECURSIVE office_data
      AS
         (SELECT id,
                 parent_id,
                 name_bn,
                 layer_id
            FROM master.office_info
          WHERE id = $1
          UNION
          SELECT a.id,
                 a.parent_id,
                 a.name_bn,
                 a.layer_id
            FROM master.office_info a
                 INNER JOIN office_data b ON a.doptor_id = $2 AND b.id = a.parent_id 
    )
   SELECT *
     FROM office_data
     order by id`;
      result = (await pool.query(sql, [officeId, doptorId])).rows;

      result = result.filter((value: any) => value.layer_id == layerId);
    } else {
      sql = `SELECT id, name_bn, name_en FROM master.office_info WHERE doptor_id = $1`;
      result = (await pool.query(sql, [doptorId])).rows;
    }
    return result.length > 0 ? (toCamelKeys(result) as any) : [];
  }
}
