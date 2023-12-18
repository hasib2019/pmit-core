import e from "cors";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import { buildInsertSql, buildUpdateSql } from "rdcd-common";
import _ from "lodash";
import { connect } from "http2";
import { Pool } from "pg";

@Service()
export class LedgerService {
  constructor() {}

  //create new GL

  //updateGl

  //get all gl list
  async getAllGl(
    doptorId: Number,
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object
  ) {
    let queryText: string = "";
    let result;
    const pool = await db.getConnection("slave");
    const sql: string = "SELECT * FROM loan.glac_mst";
    allQuery = { ...allQuery, doptorId, isActive: true };
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(
        sql,
        allQuery,
        "AND",
        this.injectionFilter,
        "id",
        limit,
        offset
      );

      const queryText = isPagination ? createSql[0] : createSql[1];

      result = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      queryText = isPagination
        ? "SELECT * FROM loan.glac_mst WHERE doptor_id = $1 AND is_active = true ORDER BY id LIMIT $2 OFFSET $3"
        : "SELECT * FROM loan.glac_mst WHERE doptor_id = $1 AND is_active = true ORDER BY id";
      result = (
        await pool.query(
          queryText,
          isPagination ? [doptorId, limit, offset] : [doptorId]
        )
      ).rows;
    }

    return result.length > 0 ? toCamelKeys(result) : [];
  }
  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM loan.glac_mst";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await (
        await db.getConnection("slave")
      ).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM loan.glac_mst";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }

  //get sub GL info
  async getSubGlInfo(type?: number) {
    const pool = db.getConnection("slave");
    let sql;
    let result;
    if (type) {
      sql = `
    SELECT id, name, ref_no FROM loan.sub_gl WHERE type = $1 AND is_active = true`;
      result = (await pool.query(sql, [type])).rows;
    } else {
      sql = `
            SELECT 
              a.id, 
              a.type, 
              b.display_value type_name, 
              a.name, 
              a.ref_no, 
              a.is_active 
            FROM 
              loan.sub_gl a 
              LEFT JOIN master.code_master b ON a.type = b.id 
            ORDER BY 
              a.id`;
      result = (await pool.query(sql)).rows;
    }
    return result.length > 0 ? (toCamelKeys(result) as any) : [];
  }
  async getSegregatioList(doptorId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  id, 
                  segregation_sector_name 
                FROM 
                  loan.service_charge_seg_list 
                WHERE 
                  doptor_id = $1 
                  AND is_active = true`;
    const result = (await pool.query(sql, [doptorId])).rows;
    return result.length > 0 ? toCamelKeys(result) : [];
  }

  async getChargeTypes() {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  id, 
                  charge_type, 
                  charge_type_desc 
                FROM 
                  loan.product_charge_type 
                WHERE 
                  is_active = true
                ORDER BY id ASC `;
    const result = (await pool.query(sql)).rows;
    return result.length > 0 ? toCamelKeys(result) : [];
  }
}
