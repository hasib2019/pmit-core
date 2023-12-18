/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-07-03 16:45:50
 * @modify date 2022-07-03 16:45:50
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { buildGetSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export class OfficeDesignationService {
  constructor() {}

  async getDesignationById(id: number) {
    const { queryText, values } = buildGetSql(["name_bn", "name_en"], "master.office_designation", { id });

    const {
      rows: [designation],
    } = await (await db.getConnection("slave")).query(queryText, values);

    return toCamelKeys(designation);
  }
}
