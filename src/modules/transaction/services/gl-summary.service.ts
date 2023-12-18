/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-09-01 13:14:26
 * @modify date 2022-09-01 13:14:26
 * @desc [description]
 */

import { PoolClient } from "pg";
import { buildGetSql, buildInsertSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import { GLSummaryAttrs } from "../interfaces/gl-summary.interface";

@Service()
export class GLSummaryService {
  constructor() {}

  async upsertSummary(
    summary: GLSummaryAttrs,
    createdBy: number | string,
    transaction: PoolClient
  ) {
    const { queryText, values } = buildGetSql(["id"], "loan.gl_summary", {
      doptorId: summary.doptorId,
      officeId: summary.officeId,
      projectId: summary.projectId,
      tranDate: summary.tranDate,
      glacId: summary.glacId,
    });

    const {
      rows: [existingSummary],
    } = await transaction.query(queryText, values);
    if (existingSummary) {
      const updateSql = buildUpdateSql(
        "loan.gl_summary",
        existingSummary.id,
        {
          debitAmt: summary.debitAmt,
          creditAmt: summary.creditAmt,
          updatedBy: createdBy,
          updatedAt: new Date(),
        },
        "id"
      );

      await transaction.query(updateSql.sql, updateSql.params);

      return;
    }
    const { sql, params } = buildInsertSql("loan.gl_summary", {
      doptorId: summary.doptorId,
      officeId: summary.officeId,
      projectId: summary.projectId,
      tranDate: summary.tranDate,
      glacId: summary.glacId,
      debitAmt: summary.debitAmt,
      creditAmt: summary.creditAmt,
      createdBy,
      createdAt: new Date(),
    });
    await transaction.query(sql, params);
  }
}
