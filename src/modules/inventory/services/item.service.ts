import { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { ItemAttributes } from "../interfaces/item.interface";
import lodash from "lodash";
import { load } from "js-yaml";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";
@Service()
export class ItemService {
  constructor() {}

  async createItem(itemData: ItemAttributes) {
    const { groupId, categoryId, mouId } = itemData;
    const connection = await db.getConnection("master").connect();
    try {
      connection.query("BEGIN");
      let sqlCounter = `SELECT MAX(item_code)
      FROM inventory.item_info`;

      const resCounter = await connection.query(sqlCounter);
      let result;
      let code: number = resCounter.rows[0].max ? Number(resCounter.rows[0].max) + 1 : 0 + 1;
      itemData.itemCode = code;
      const { sql, params } = buildInsertSql("inventory.item_info", lodash.omit(itemData, ["groupId", "doptorItems"]));

      result = (await connection.query(sql, params)).rows[0];

      const { doptorItems } = itemData;

      for (let doptorItem of doptorItems) {
        const { sql, params } = buildInsertSql("inventory.doptor_item", { ...doptorItem, itemId: result.id });
        connection.query(sql, params);
      }
      result.group_id = groupId;
      const groupNameSql = `select group_name from inventory.item_group where id = $1`;
      const categoryNameSql = `select category_name from inventory.item_category where id = $1`;
      const unitNameSql = `select mou_name from inventory.measurement_unit where id = $1`;
      const groupName = (await connection.query(groupNameSql, [groupId])).rows[0].group_name;
      const categoryName = (await connection.query(categoryNameSql, [categoryId])).rows[0].category_name;
      const mouName = (await connection.query(unitNameSql, [mouId])).rows[0].mou_name;
      result.category_name = categoryName;
      result.group_name = groupName;
      result.mou_name = mouName;
      connection.query("COMMIT");
      return toCamelKeys(result);
    } catch (error: any) {
      connection.query("ROLLBACK");
      throw new BadRequestError(error);
    } finally {
      connection.release();
    }
  }

  async getItemWithOrWithhoutPaginationAdQuery(
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: Object,
    doptorId: number,
    tableName: String
  ) {
    const connection = db.getConnection("slave");
    let result;

    if (Object.keys(allQuery).length > 0) {
      const sql = `select a.*,b.category_name,c.group_name,c.id as group_id, d.mou_name from inventory.item_info a 
      inner join inventory.item_category b on a.category_id =b.id inner join inventory.item_group c
      on b.group_id =c.id inner join inventory.measurement_unit d on a.mou_id= d.id where `;
      const queryWherePortion = Object.keys(allQuery)
        .map((elm, index) => {
          return `${elm == "category_name" ? "b." : elm == "group_name" ? "c." : "a."}${elm}=$${index + 1}`;
        })
        .join(" AND ");
      const qureyPortionValues = Object.values(allQuery);

      try {
        result = (await connection.query(sql + queryWherePortion, qureyPortionValues)).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    } else {
      const queryText = `select a.*,b.category_name,c.group_name,c.id as group_id, d.mou_name from inventory.item_info a 
      inner join inventory.item_category b on a.category_id =b.id inner join inventory.item_group c
      on b.group_id =c.id inner join inventory.measurement_unit d on a.mou_id= d.id inner join inventory.doptor_item e on e.item_id =a.id and e.doptor_id =$1 and e.is_active = true where  a.is_active = true`;
      try {
        result = (await connection.query(queryText, [doptorId])).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    }
    return result.length > 0 ? toCamelKeys(result) : [];
  }
  async updateItem(itemData: ItemAttributes) {
    const { id, groupId, categoryId, mouId, doptorItems } = itemData;

    const connection = await db.getConnection("master").connect();
    try {
      connection.query("BEGIN");
      const updateHistory = await compareTwoObjectAndMakeUpdateHistory("inventory.item_info", itemData, Number(id));
      itemData.updateHistory = updateHistory;
      const { sql, params } = buildUpdateSql(
        "inventory.item_info",
        Number(id),
        lodash.omit(itemData, ["groupId", "doptorItems"]),
        "id"
      );
      const result = (await connection.query(sql, params)).rows[0];
      const existingDoptorItemSql = `select id, doptor_id from inventory.doptor_item where item_id = $1`;
      const existingDoptorItems = (await connection.query(existingDoptorItemSql, [id])).rows;
      let existingDoptorItemObj: any = {};
      let payloadDoptorItemObj: any = {};
      for (let existingDoptorItem of existingDoptorItems) {
        existingDoptorItemObj[existingDoptorItem.doptor_id] = existingDoptorItem.id;
      }
      for (let doptorItem of doptorItems) {
        payloadDoptorItemObj[doptorItem.doptorId] = true;
        if (existingDoptorItemObj[doptorItem.doptorId]) {
          const { sql, params } = buildUpdateSql(
            "inventory.doptor_item",
            Number(existingDoptorItemObj[doptorItem.doptorId]),
            { ...doptorItem, isActive: true },
            "id"
          );
          (await connection.query(sql, params)).rows[0];
        } else {
          const { sql, params } = buildInsertSql("inventory.doptor_item", {
            ...doptorItem,
            itemId: id,
            isActive: true,
          });
          await connection.query(sql, params);
        }
      }
      for (let existingDoptorItem of existingDoptorItems) {
        if (!payloadDoptorItemObj[existingDoptorItem.doptor_id]) {
          const updateIsActiveSql = `update inventory.doptor_item set is_active = false where id =$1`;
          const isActiveUpdateResult = (await connection.query(updateIsActiveSql, [existingDoptorItem.id])).rows[0];
          // (await connection.query(sql, params)).rows[0];
        }
      }
      const groupNameSql = `select group_name from inventory.item_group where id = $1`;
      const categoryNameSql = `select category_name from inventory.item_category where id = $1`;
      const unitNameSql = `select mou_name from inventory.measurement_unit where id = $1`;
      const groupName = (await connection.query(groupNameSql, [groupId])).rows[0].group_name;
      const categoryName = (await connection.query(categoryNameSql, [categoryId])).rows[0].category_name;
      const mouName = (await connection.query(unitNameSql, [mouId])).rows[0].mou_name;
      result.category_name = categoryName;
      result.group_name = groupName;
      result.mou_name = mouName;
      connection.query("COMMIT");
      return toCamelKeys(result);
    } catch (error: any) {
      connection.query("ROLLBACK");
      throw new BadRequestError(error);
    } finally {
      connection.release();
    }
  }
  async getDoptorItemInfoByItemId(itemId: number) {
    const connection = db.getConnection("slave");
    const sql = `select doptor_id,prefix,sl_number_length from inventory.doptor_item where item_id = $1 and is_active=true`;
    const result = (await connection.query(sql, [itemId])).rows;
    return result ? toCamelKeys(result) : [];
  }

  async isItemDuplicate(itemName: String, id?: number) {
    const connection = db.getConnection("slave");
    try {
      const sql = `select count(id) from inventory.item_info where item_name =$1 ${id ? "and id <> $2" : ""}`;
      const result = (await connection.query(sql, id ? [itemName, id] : [itemName])).rows[0]?.count;
      return result > 0 ? true : false;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getDoptor() {
    const connection = db.getConnection("slave");
    const sql = `select id, name_bn from master.doptor_info`;
    const result = (await connection.query(sql, [])).rows;
    return result ? toCamelKeys(result) : [];
  }
}
