import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";

@Service()
export class EmployeeRecordServices {
  constructor() {}
  async get(officeId: number) {
    const queryText = `select a.id designation_id, b.id employee_id, b.name_bn employee_name,a.designation
        from master.employee_office a, master.employee_record b
        where a.employee_record = b.id
        AND a.office=$1 and status =$2`;
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, [officeId, "TRUE"])).rows;

    return result ? toCamelKeys(result) : [];
  }
}
