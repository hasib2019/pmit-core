import { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { StoreAttr } from "../interfaces/store.interface";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";
@Service()
export class StoreService {
  async createStore(storeData: StoreAttr) {
    const connection = db.getConnection("master");
    const { doptorId, officeId, unitId, adminDeskId } = storeData;
    try {
      const doptorNameSql = `select name_bn from master.doptor_info where id = $1`;
      const officeNameSql = `select name_bn from master.office_info where id = $1`;
      const unitNameSql = `select name_bn from master.office_unit where id = $1`;
      const adminDeskNameSql = `select name_bn from master.office_designation where id = $1`;
      const doptorName = (await connection.query(doptorNameSql, [doptorId])).rows[0]?.name_bn;
      const officeName = (await connection.query(officeNameSql, [officeId])).rows[0]?.name_bn;
      const officeUnitName = (await connection.query(unitNameSql, [unitId])).rows[0]?.name_bn;
      const adminDesignationName = (await connection.query(adminDeskNameSql, [adminDeskId])).rows[0]?.name_bn;

      const { sql, params } = buildInsertSql("inventory.store_info", storeData);
      const result = (await connection.query(sql, params)).rows[0];
      result.doptor_name_bangla = doptorName;
      result.office_name_bangla = officeName;
      result.unit_name_bangla = officeUnitName ? officeUnitName : null;
      result.designation_name_bangla = adminDesignationName;
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async updateStore(storeData: StoreAttr) {
    const connection = db.getConnection("master");
    const { id, doptorId, officeId, unitId, adminDeskId } = storeData;
    try {
      const doptorNameSql = `select name_bn from master.doptor_info where id = $1`;
      const officeNameSql = `select name_bn from master.office_info where id = $1`;
      const unitNameSql = `select name_bn from master.office_unit where id = $1`;
      const adminDeskNameSql = `select name_bn from master.office_designation where id = $1`;
      const doptorName = (await connection.query(doptorNameSql, [doptorId])).rows[0]?.name_bn;
      const officeName = (await connection.query(officeNameSql, [officeId])).rows[0]?.name_bn;
      const officeUnitName = (await connection.query(unitNameSql, [unitId])).rows[0]?.name_bn;
      const adminDesignationName = (await connection.query(adminDeskNameSql, [adminDeskId])).rows[0]?.name_bn;
      const updateHistory = await compareTwoObjectAndMakeUpdateHistory("inventory.store_info", storeData, Number(id));
      storeData.updateHistory = updateHistory;
      const { sql, params } = buildUpdateSql("inventory.store_info", Number(id), storeData, "id");
      const result = (await connection.query(sql, params)).rows[0];
      result.doptor_name_bangla = doptorName;
      result.office_name_bangla = officeName;
      result.unit_name_bangla = officeUnitName ? officeUnitName : null;
      result.designation_name_bangla = adminDesignationName;
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  async getStoreWithOrWithhoutPaginationAdQuery(
    officeId: number,
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: Object,
    tableName: String
  ) {
    const connection = db.getConnection("slave");
    let result;

    if (Object.keys(allQuery).length > 0) {
      const sql = `select a.*, b.name_bn as doptor_name_bangla ,c.name_bn as office_name_bangla,
      d.name_bn as designation_name_bangla ,e.name_bn as unit_name_bangla from 
      inventory.store_info a inner join master.doptor_info b on a.doptor_id = b.id
      inner join master.office_info c on c.id = a.office_id
      inner join master.office_designation d on d.id = a.admin_desk_id
      left join master.office_unit e on e.id = a.unit_id  where a.office_id = $1`;
      const queryWherePortion = Object.keys(allQuery)
        .map((elm, index) => {
          return `a.${elm}=$${index + 1}`;
        })
        .join(" AND ");
      const qureyPortionValues = Object.values(allQuery);

      try {
        result = (await connection.query(sql + queryWherePortion, qureyPortionValues)).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    } else {
      const queryText = `  select a.*, b.name_bn as doptor_name_bangla ,c.name_bn as office_name_bangla,
      d.name_bn as designation_name_bangla ,f.name_bn as admin_name, e.name_bn as unit_name_bangla from 
      inventory.store_info a inner join master.doptor_info b on a.doptor_id = b.id
      inner join master.office_info c on c.id = a.office_id
      inner join master.office_designation d on d.id = a.admin_desk_id
	    inner join master.office_employee f on f.designation_id = a.admin_desk_id
      left join master.office_unit e on e.id = a.unit_id where a.office_id = $1`;
      try {
        result = (await connection.query(queryText, [officeId])).rows;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    }
    return result.length > 0 ? toCamelKeys(result) : [];
  }
  async isStoreDuplicate(doptorId: Number, officeId: Number, storeName: String, id?: number) {
    const connection = db.getConnection("slave");
    try {
      const sql = `select count(id) from inventory.store_info where doptor_id =$1 and
       office_id = $2 and store_name = $3 ${id ? " and id <> $4" : ""}`;
      const result = (
        await connection.query(sql, id ? [doptorId, officeId, storeName, id] : [doptorId, officeId, storeName])
      ).rows[0]?.count;
      return result > 0 ? true : false;
    } catch (error: any) { }
  }
}
