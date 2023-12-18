import { toCamelKeys, toSnakeCase } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";
import { buildInsertSql } from "../../../utils/sql-builder.util";
import { PoolClient } from "pg";

@Service()
export default class FieldOfficerAssignApprovalService {
  constructor() {}
  async fieldOfficerUpdateApproval(userId: number, data: any, doptorId: number, transaction: PoolClient) {
    const camelCaseFieldOfficerData = toCamelKeys(data) as any;
    let resFieldOfficer: any = [];
    const fieldOfficerSql = `SELECT
                              id
                            FROM
                              users.user
                            WHERE
                              doptor_id = $1
                              AND office_id = $2
                              AND employee_id = $3`;
    const foCountSql = `SELECT
                          COUNT(*) 
                        FROM 
                          samity.field_officer_info
                        WHERE
                          doptor_id = $1
                          AND office_id = $2
                          AND employee_id = $3`;

    const foDeleteSql = `DELETE 
                        FROM 
                          samity.field_officer_info
                        WHERE
                          doptor_id = $1
                          AND office_id = $2
                          AND employee_id = $3`;
    for (const value of camelCaseFieldOfficerData.fieldOfficerData) {
      if (value.isChecked == true && value.foStatus == false) {
        let fieldOfficerData = (await transaction.query(fieldOfficerSql, [doptorId, value.id, value.employeeId]))
          .rows[0];

        if (!fieldOfficerData) {
          throw new BadRequestError(`মাঠ কর্মকর্তার জন্য নির্বাচিত কর্মচারী ব্যবহারকারী হিসেবে বিদ্যমান নেই`);
        }
        let { sql, params } = buildInsertSql("samity.field_officer_info", {
          userId: fieldOfficerData.id,
          doptorId: doptorId,
          officeId: value.id,
          employeeId: value.employeeId,
          isActive: true,
          authorizeStatus: "A",
          authorizedBy: userId,
          authorizedAt: new Date(),
          createdBy: userId,
        });
        let result = (await transaction.query(sql, params)).rows[0];

        resFieldOfficer.push(result);
      } else if (value.isChecked == false && value.foStatus == true) {
        let foCount = (await transaction.query(foCountSql, [doptorId, value.id, value.employeeId])).rows[0].count;
        if (foCount != 0) {
          (await transaction.query(foDeleteSql, [doptorId, value.id, value.employeeId])).rows[0];
        }
      }
    }

    return resFieldOfficer;
  }
  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
