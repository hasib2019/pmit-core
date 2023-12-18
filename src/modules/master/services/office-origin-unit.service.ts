import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";

@Service()
export class OfficeOriginUnitServices {
  constructor() {}
  async get() {
    // const queryText = `select id,name_bn unit_name ,office_origin
    //     from master.office_origin_unit where status=$1`;

    const queryText = `select id,name_bn,name_en,layer_id from master.office_origin`;
    const result = (await (await pgConnect.getConnection("slave")).query(queryText)).rows;

    return result ? toCamelKeys(result) : [];
  }
}
