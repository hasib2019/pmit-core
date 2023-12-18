import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export default class EmployeeService {
  constructor() {}

  async getFieldOfficer(officeId: number, userId: number) {
    const pool = db.getConnection("slave");
    let sql: string;
    let fieldOfficerInfo;
    sql = `SELECT 
            a.user_id id, 
            b.name_bn 
          FROM 
            samity.field_officer_info a 
            INNER JOIN master.office_employee b ON b.id = a.employee_id 
          WHERE 
            a.office_id = $1`;
    fieldOfficerInfo = (await pool.query(sql, [officeId])).rows;
    let foUserIds;
    if (fieldOfficerInfo && fieldOfficerInfo[0]) {
      foUserIds = fieldOfficerInfo.map((value: any) => value.id);
      if (foUserIds && foUserIds.includes(userId)) {
        fieldOfficerInfo = fieldOfficerInfo.filter((value: any) => value.id == userId);
      }
    }

    return fieldOfficerInfo.length > 0 ? (toCamelKeys(fieldOfficerInfo) as any) : [];
  }

  //get employee info of a office
  async getEmployeeList(officeId: number, employeeId: number) {
    const pool = db.getConnection("slave");
    const sql = `select
                   a.name_bn as designation,
                   a.id as designation_id,
                      b.name_bn as employee_name,
                      b.id as employee_id
                 from
                   master.office_designation a
                 inner join master.office_employee b on
                   b.designation_id = a.id
                 inner join master.office_info c on
                   a.office_id = c.id
                 where
                   c.id = $1
                   and b.id != $2`;
    const result = await (await pool.query(sql, [officeId, employeeId])).rows;

    return result ? (toCamelKeys(result) as any) : result;
  }
}
