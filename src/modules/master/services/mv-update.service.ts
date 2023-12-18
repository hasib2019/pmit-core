import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export class MaterializedViewService {
  constructor() {}

  async materializedView() {
    const pool = db.getConnection();
    let sqls = [
      `REFRESH MATERIALIZED VIEW  master.mv_level_wise_office;`,
      `REFRESH MATERIALIZED VIEW  master.mv_upazila_city_info;`,
      `REFRESH MATERIALIZED VIEW  master.mv_union_thana_paurasabha_info;`,
    ];
    var updateInfo;
    for (const sql of sqls) updateInfo = await pool.query(sql);

    return updateInfo ? "success" : "fail";
  }
}
