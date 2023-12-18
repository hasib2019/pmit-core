import { toCamelKeys, toSnakeCase } from "keys-transform";
import { default as lo, default as _ } from "lodash";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export class LedgerService {
  constructor() { }

  //create new GL

  async createGl(data: any) {
    const transaction = await db.getConnection("master").connect();

    try {
      transaction.query("BEGIN");
      const sql2 = `SELECT max_level, glac_code_parent, glac_code_child FROM loan.glac_setup 
  WHERE doptor_id = $1`;
      const sql2Result = await (await transaction.query(sql2, [data.doptorId])).rows[0];

      const sql3 = `SELECT level_code, length(glac_code) FROM loan.glac_mst WHERE id = $1;`;
      const sql3Result = (await transaction.query(sql3, [parseInt(data.parentId)])).rows[0];
      sql3Result.level_code <= 2 ? (data.parentChild = "P") : (data.parentChild = "C");
      const parentGlCodeLength = data.parentGlCode.toString().length + 1;
      const toCutDigitOfSubstr =
        data.parentChild === "P" ? parseInt(sql2Result.glac_code_parent) : parseInt(sql2Result.glac_code_child);
      // const sql4 = `SELECT LPAD(cast(MAX (TO_NUMBER(
      //   case when
      //  (SUBSTR (glac_code, ${parentGlCodeLength},  ${toCutDigitOfSubstr})
      //   is null or SUBSTR (glac_code, ${parentGlCodeLength},
      //     ${toCutDigitOfSubstr})= '' )then '0' else SUBSTR (glac_code, 4, 2) end
      //  ,'99G999D9S'))+1 as varchar),2,'0') as glCode
      //  FROM loan.glac_mst
      //  WHERE doptor_id = $1 and  parent_id = $2`;

      const sqll = `	Select  SUBSTR (glac_code, ${parentGlCodeLength},  ${toCutDigitOfSubstr}) from loan.glac_mst where doptor_id = $1 and parent_id = $2`;
      const sqllResult = await transaction.query(sqll, [data.doptorId, parseInt(data.parentId)]);
      // const idText = {sqllResult.rows.length ===0?'id':}
      const text = `SUBSTR (glac_code, ${parentGlCodeLength},  ${toCutDigitOfSubstr})`;

      const sql4 = `	SELECT       LPAD(cast(MAX ( cast (   ${sqllResult.rows.length > 0 ? text : "0"
        } as integer) )+1 as varchar),${toCutDigitOfSubstr},'0') as glCode
                   FROM loan.glac_mst
                   WHERE doptor_id = $1 and ${sqllResult.rows.length > 0 ? "parent_id" : "id"}= $2`;


      const sql4Result = await (await transaction.query(sql4, [data.doptorId, parseInt(data.parentId)])).rows[0];



      data.glacCode = data.parentGlCode + sql4Result.glcode.toString();
      data.levelCode = sql3Result.level_code + 1;
      const filteredData = _.omit(data, "parentGlCode");


      const { sql, params } = buildInsertSql("loan.glac_mst", {
        ...filteredData,
      });

      const createGlResult = await transaction.query(sql, params);



      transaction.query("COMMIT");

      return toCamelKeys(createGlResult.rows[0]);
    } catch (error: any) {


      transaction.query("ROLLBACK");
      throw new BadRequestError(error);
    } finally {
      transaction.release();
    }
  }

  //updateGl

  async updateGl(data: any, id: number) {
    const pool = await db.getConnection("master");
    try {
      const dataWithoutParentGl = _.omit(data, "parentGlCode");
      const getGlByIdSql = "select * from loan.glac_mst where id = $1";

      const getSqlByIdResult = await (await pool.query(getGlByIdSql, [id])).rows[0];
      const objectFromDatabase = {
        ...getSqlByIdResult,
      };
      const filteredObjectFromDatabase: any = _.omit(
        toCamelKeys(objectFromDatabase),
        "updateHistory",
        "id",
        "doptorId",
        "projectId",
        "officeId",
        "levelCode",
        "authorizedBy",
        "authorizedAt",
        "createdBy",
        "createdAt",
        "authorizeStatus",
        "updatedAt",
        "updatedBy"
      );
      const objectFromUpdatePayload = {
        ...dataWithoutParentGl,
      };

      let afterUpdate: any = {};
      let beforeUpdate: any = {};

      const filteredPayload = _.omit(objectFromUpdatePayload, "authorize_status", "updatedAt", "updatedBy");

      const keys = Object.keys(filteredPayload);
      for (const element of keys) {
        if (filteredObjectFromDatabase[element] !== filteredPayload[element]) {
          afterUpdate[element] = filteredPayload[element];
          beforeUpdate[element] = filteredObjectFromDatabase[element];
        }
      }
      const historyArray = getSqlByIdResult.update_history ? getSqlByIdResult.update_history : [];
      historyArray.push({
        beforeUpdate: beforeUpdate,
        afterUpdate: afterUpdate,
        updatedAt: new Date(),
      });
      dataWithoutParentGl.updateHistory = JSON.stringify(historyArray);

      const { sql, params } = buildUpdateSql("loan.glac_mst", id, dataWithoutParentGl, "id");

      const updateGlResult = await pool.query(sql, params);



      return toCamelKeys(updateGlResult.rows[0]);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  //get all gl list
  async getAllGl(doptorId: Number, isPagination: boolean, limit: number, offset: number, allQuery: object) {
    let queryText: string = "";
    let result;
    const pool = await db.getConnection("slave");
    const sql: string = "SELECT * FROM loan.glac_mst ";
    allQuery = { ...allQuery, doptorId, isActive: true };
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);


      const queryText = isPagination ? createSql[0] : createSql[1];


      result = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      queryText = isPagination
        ? "SELECT * FROM loan.glac_mst WHERE doptor_id = $1 AND is_active = true  LIMIT $2 OFFSET $3"
        : "SELECT * FROM loan.glac_mst WHERE doptor_id = $1 AND is_active = true  desc";
      result = (await pool.query(queryText, isPagination ? [doptorId, limit, offset] : [doptorId])).rows;
    }


    return result.length > 0 ? toCamelKeys(result) : [];
  }
  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM loan.glac_mst";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
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

  async createSubGl(
    userId: number,
    data: any
    // transaction: PoolClient
  ) {
    const pool = await db.getConnection("master");
    try {
      const camelCaseData = toCamelKeys(data) as any;
      var resSubGl;
      for (const v of camelCaseData.data.subGl) {
        if (v.id) {
          const { sql: updateSql, params: updateParams } = buildUpdateSql(
            "loan.sub_gl",
            v.id,

            { ...lo.omit(v, ["id"]), updatedBy: userId, updatedAt: new Date() },
            "id"
          );
          resSubGl = await (await pool.query(updateSql, updateParams)).rows[0];
        } else {
          const { sql: createSql, params: createParams } = buildInsertSql("loan.sub_gl", {
            ...lo.omit(v, ["id"]),
            createdBy: userId,
            createdAt: new Date(),
          });
          resSubGl = (await pool.query(createSql, createParams)).rows[0];
        }
      }
      return resSubGl;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
}
