import { toCamelKeys, toSnakeCase } from "keys-transform";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export default class DoptorService {
  constructor() { }

  // get project with pagination
  async getDoptorList(doptorId: number, componentId: number) {
    const pool = db.getConnection("slave");
    let getDoptorSql, doptorData;
    if (componentId === 9) {
      getDoptorSql = `WITH RECURSIVE doptor_data AS (
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
      doptorData = (await pool.query(getDoptorSql, [doptorId, componentId])).rows;
    } else {
      getDoptorSql = `WITH RECURSIVE doptor_data AS (
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
                    WHERE id != 1
                    ORDER BY id`;
      doptorData = (await pool.query(getDoptorSql, [doptorId, componentId])).rows;
    }

    return doptorData.length > 0 ? toCamelKeys(doptorData) : [];
  }

  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
