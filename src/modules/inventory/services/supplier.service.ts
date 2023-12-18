import { Service } from "typedi";
import db from "../../../db/connection.db";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { SupplierAttr } from "../interfaces/supplier.interface";
import { Connection } from "pg";
import { object } from "underscore";
import { values } from "lodash";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";
@Service()
export class SupplierService {
  async createSupplier(supplierData: SupplierAttr) {
    const connection = db.getConnection("master");
    try {
      const { sql, params } = buildInsertSql("inventory.supplier_info", supplierData);
      const result = (await connection.query(sql, params)).rows[0];
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async updateSupplier(supplierData: SupplierAttr) {
    const { id } = supplierData;

    try {
      const connection = db.getConnection("master");
      const updateHistory = await compareTwoObjectAndMakeUpdateHistory(
        "inventory.supplier_info",
        supplierData,
        Number(id)
      );
      supplierData.updateHistory = updateHistory;
      const { sql, params } = buildUpdateSql("inventory.supplier_info", Number(id), supplierData, "id");
      const result = (await connection.query(sql, params)).rows[0];
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getSupplier(
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: Object,
    tableName: String,
    doptorId: number
  ) {
    const connection = db.getConnection("slave");

    let sql;
    let queryWherePortion = "";
    let values = [];
    if (Object.keys(allQuery).length > 0) {
      sql = `select * from inventory.supplier_info where `;
      queryWherePortion = Object.keys(allQuery)
        .map((elm, index) => `${elm}=$${index + 1}`)
        .join(" AND ");
      values = Object.values(allQuery);
    } else {
      sql = "select * from inventory.supplier_info where doptor_id = $1";
      values = [doptorId];
    }
    try {
      const finalSql = sql + queryWherePortion;
      const result = (await connection.query(finalSql, values)).rows;
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  async checkIsSupplierDuplicate(doptorId: number, officeId: number, supplierName: String, id?: number) {
    const connection = db.getConnection("slave");
    try {
      const sql = `select count(id) from inventory.supplier_info where doptor_id = $1 and
 office_id = $2 and supplier_name = $3 ${id ? " and id <> $4" : ""}`;
      const result = (
        await connection.query(sql, id ? [doptorId, officeId, supplierName, id] : [doptorId, officeId, supplierName])
      ).rows[0]?.count;
      return result > 0 ? true : false;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
}
