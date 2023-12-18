import { toCamelKeys, toSnakeCase } from "keys-transform";
import { BadRequestError, buildGetSql, buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { OfficeGetByIdAttrs } from "./../interfaces/office-info.interface";

@Service()
export class OfficeInfoServices {
  constructor() {}

  async get(limit: number, offset: number, allQuery: any, isPagination: boolean) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM master.office_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM master.office_info ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM master.office_info ORDER BY id ";
      result = await (await db.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return result.rows ? toCamelKeys(result.rows) : result.rows;
  }

  async getByOrigin(origin: number | null) {
    const { queryText, values } = buildGetSql(
      ["id", "doptor_id", "division_id", "district_id", "upazila_id", "name_bn"],
      "master.office_info",
      { originId: origin }
    );
    const data = (await (await db.getConnection("slave")).query(queryText, values)).rows;
    return data ? toCamelKeys(data) : {};
  }

  // async getById(id: number): Promise<OfficeGetByIdAttrs | any> {
  //   const { queryText, values } = buildGetSql(
  //     ["division_id", "district_id", "upazila_id", "name_bn", "name_en"],
  //     "master.office_info",
  //     { id }
  //   );

  //   const [data] = (await (await db.getConnection("slave")).query(queryText, values)).rows;
  //   return data ? toCamelKeys(data) : {};
  // }
  async getById(id: number): Promise<OfficeGetByIdAttrs | any> {
    const queryText = `SELECT ID,
            A.DIVISION_ID,
            A.DISTRICT_ID,
            A.UPAZILA_ID,
            A.NAME_BN,
            A.NAME_EN,
            B.UPA_CITY_TYPE
          FROM MASTER.OFFICE_INFO A
          LEFT JOIN MASTER.MV_UPAZILA_CITY_INFO B ON B.UPA_CITY_ID = A.UPAZILA_ID
          WHERE A.ID = $1`;

    const values = [id];

    const [data] = await (await db.getConnection("slave").query(queryText, values)).rows;

    if (!data) throw new BadRequestError("ব্যবহারকারীর অফিস বিদ্যমান নেই");
    return data ? toCamelKeys(data) : {};
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM master.office_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM master.office_info";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
