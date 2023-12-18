import { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { ItemGroupAttributes } from "../interfaces/item-group.interface";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";
@Service()
export class ItemGroupServices {
  constructor() {}
  async createGroup(itemGroupData: ItemGroupAttributes) {
    const { groupName, createdBy, createdAt } = itemGroupData;
    try {
      const connection = db.getConnection("master");
      const { sql, params } = buildInsertSql("inventory.item_group", { ...itemGroupData });
      const queryResult = (await connection.query(sql, [groupName, createdBy, createdAt])).rows[0];
      return toCamelKeys(queryResult);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async updateGroup(itemGroupData: ItemGroupAttributes, id: number) {
    const connection = db.getConnection("master");
    try {
      const updateHistory = await compareTwoObjectAndMakeUpdateHistory("inventory.item_group", itemGroupData, id);
      itemGroupData.updateHistory = updateHistory;
      const { sql, params } = buildUpdateSql("inventory.item_group", id, itemGroupData, "id");

      const queryResult = (await connection.query(sql, params)).rows[0];
      return toCamelKeys(queryResult);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
  async count(allQuery: object, tablName: String) {
    var queryText: string = "";
    const sql: string = `SELECT COUNT(id) FROM ${tablName}`;
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = `SELECT COUNT(id) FROM ${tablName}`;
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }
  async getItemByTableNameWithOptionalPaginationAndQuery(
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: Object,
    tableName: String
  ) {
    const connection = db.getConnection("slave");
    let queryText: String = "";
    const sql = `select * from ${tableName}`;

    let result;
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];
      try {
        result = (await connection.query(queryText, allQueryValues)).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    } else {
      const queryText = `select * from ${tableName}`;
      try {
        result = (await connection.query(queryText, [])).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    }
    return result.length > 0 ? toCamelKeys(result) : [];
  }

  async checkIsGroupNameDuplicate(groupName: string, id?: number) {
    const connection = db.getConnection("slave");
    const sql = `select count(id) from inventory.item_group where group_name = $1 ${id ? "and id <> $2" : ""}`;
    const { count } = (await connection.query(sql, id ? [groupName, id] : [groupName])).rows[0];
    return count > 0 ? true : false;
  }
}

// async getAllGl(doptorId: Number, isPagination: boolean, limit: number, offset: number, allQuery: object) {
//   let queryText: string = "";
//   let result;
//   const pool = await db.getConnection("slave");
//   const sql: string = "SELECT * FROM loan.glac_mst ";
//   allQuery = { ...allQuery, doptorId, isActive: true };
//   const allQueryValues: any[] = Object.values(allQuery);
//   if (Object.keys(allQuery).length > 0) {
//     const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);


//     const queryText = isPagination ? createSql[0] : createSql[1];


//     result = (await pool.query(queryText, allQueryValues)).rows;
//   } else {
//     queryText = isPagination
//       ? "SELECT * FROM loan.glac_mst WHERE doptor_id = $1 AND is_active = true  LIMIT $2 OFFSET $3"
//       : "SELECT * FROM loan.glac_mst WHERE doptor_id = $1 AND is_active = true  desc";
//     result = (await pool.query(queryText, isPagination ? [doptorId, limit, offset] : [doptorId])).rows;
//   }


//   return result.length > 0 ? toCamelKeys(result) : [];
// }
