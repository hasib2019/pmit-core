import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";

@Service()
export class OfficeOriginServices {
  constructor() {}

  async get(limit: number, offset: number, allQuery: any, isPagination: boolean) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM master.office_origin";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM master.office_origin ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM master.office_origin ORDER BY id ";
      result = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return result.rows ? toCamelKeys(result.rows) : result.rows;
  }

  async getOriginRecursive(userDoptor: number) {
    const originSql = `select origin_id from master.doptor_info where id=$1`;
    const doptorOrigin = (await (await pgConnect.getConnection("slave")).query(originSql, [userDoptor])).rows[0]
      ?.origin_id;

    const userOriginSql = `WITH RECURSIVE a AS (
        SELECT id, parent_id,name_bn
        FROM master.office_origin
        WHERE id =$1
        UNION ALL
        SELECT d.id, d.parent_id,d.name_bn
        FROM master.office_origin d
        JOIN a ON a.id = d.parent_id )
        SELECT id, parent_id ,name_bn
        FROM a`;

    const originData = (await (await pgConnect.getConnection("slave")).query(userOriginSql, [doptorOrigin])).rows;

    return originData ? toCamelKeys(originData) : originData;
  }

  async userOfficeOrigin(officeId: number) {
    const sql = `select
                     a.*
                 from
                     master.office_origin a
                 inner join master.office_info b on
                     a.id = b.origin_id
                 where
                     b.id = $1`;
    const data = (await (await pgConnect.getConnection("slave")).query(sql, [officeId])).rows[0];

    return data ? toCamelKeys(data) : data;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM master.office_origin";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM master.office_origin";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
