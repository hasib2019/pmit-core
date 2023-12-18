import { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { ItemCategoryAttributes } from "../interfaces/item-category.interface";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";

@Service()
export class ItemCategoryService {
  constructor() {}

  async createItemCategory(itemCategoryData: ItemCategoryAttributes) {
    const { groupId, categoryCode, categoryName, isAsset, createdBy, createdAt } = itemCategoryData;
    try {
      const connection = db.getConnection("master");
      const { sql, params } = buildInsertSql("inventory.item_category", itemCategoryData);
      const queryResult = (
        await connection.query(sql, [groupId, categoryCode, categoryName, isAsset, createdBy, createdAt])
      ).rows[0];
      const groupNameSql = "select group_name from inventory.item_group where id = $1";
      const groupName = (await connection.query(groupNameSql, [groupId])).rows[0]?.group_name;
      queryResult.group_name = groupName;
      return toCamelKeys(queryResult);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async updateItemCategory(itemCategoryData: ItemCategoryAttributes, id: number) {
    try {
      const connection = db.getConnection("master");
      const updateHistory = await compareTwoObjectAndMakeUpdateHistory("inventory.item_category", itemCategoryData, id);
      itemCategoryData.updateHistory = updateHistory;
      const { sql, params } = buildUpdateSql("inventory.item_category", id, itemCategoryData, "id");
      const queryResult = (await connection.query(sql, params)).rows[0];
      const groupNameSql = "select group_name from inventory.item_group where id = $1";
      const groupName = (await connection.query(groupNameSql, [itemCategoryData?.groupId])).rows[0]?.group_name;
      queryResult.group_name = groupName;
      return toCamelKeys(queryResult);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
  async getAllCategoryWithOrWithoutPagination(isPagination: boolean, limit: number, offset: number, allQuery: Object) {
    const connection = db.getConnection("slave");
    let result;

    if (Object.keys(allQuery).length > 0) {
      const createSql = `select a.group_name,b.* from inventory.item_group a 
      inner join inventory.item_category b on a.id =b.group_id where `;
      const queryWherePortion = Object.keys(allQuery)
        .map((elm, index) => {
          return `${elm == "group_name" ? "a." : "b."}${elm}=$${index + 1}`;
        })
        .join(" AND ");
      const qureyPortionValues = Object.values(allQuery);

      try {
        result = (await connection.query(createSql + queryWherePortion, qureyPortionValues)).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    } else {
      const queryText = `select a.group_name, a.id as group_id,b.* from inventory.item_group a inner join inventory.item_category b on a.id =b.group_id `;
      try {
        result = (await connection.query(queryText, [])).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    }
    return result.length > 0 ? toCamelKeys(result) : [];
  }
  async isCategoryDuplicate(categoryName: String, id?: number) {
    const connection = db.getConnection("slave");
    try {
      const sql = `select count(id) from inventory.item_category where category_name = $1 ${id ? "and id <> $2" : ""}`;
      const result = (await connection.query(sql, id ? [categoryName, id] : [categoryName])).rows[0]?.count;
      return result > 0 ? true : false;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
}
