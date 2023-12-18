/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-30 11:26:08
 * @modify date 2022-08-30 11:26:08
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { Pool, PoolClient } from "pg";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";

@Service()
export class TransactionDailyService {
  constructor() {}

  async dailyTransactionIsBalanced(
    doptorId: number,
    officeId: number,
    projectId: number,
    tranDate: Date,
    transaction: PoolClient
  ) {
    const query = `
        select SUM(case when drcr_code = 'D' then tran_amt else 0 end) as dr_balance, 
        SUM(case when drcr_code = 'C' then tran_amt else 0 end) as cr_balance from loan.transaction_daily
        where doptor_id = $1 and office_id = $2 and project_id = $3 and tran_date = $4;
        `;
    const params = [doptorId, officeId, projectId, tranDate];

    const {
      rows: [{ cr_balance, dr_balance }],
    } = await transaction.query(query, params);

    return cr_balance == dr_balance;
  }

  async dailyTransactionToDetailTransaction(transactionIds: any, transaction: PoolClient) {
    // const { queryText, values } = buildGetSql(["*"], "loan.transaction_daily", {
    //   doptorId,
    //   officeId,
    //   projectId,
    //   tranDate,
    // });

    const queryText = `select * from loan.transaction_daily where id  = ANY($1 :: int[])`;
    const { rows: dailyTransactions } = await transaction.query(queryText, [transactionIds]);
    for await (const { id, ...rest } of dailyTransactions) {
      const { sql, params } = buildInsertSql("loan.transaction_dtl", {
        ...rest,
      });

      await transaction.query(sql, params);
    }
  }

  async getGLSummary(
    doptorId: number,
    officeId: number,
    projectId: number,
    tranDate: Date,
    transaction: PoolClient | Pool
  ) {
    const sql = `
    select 
      glac_id, 
      SUM(case when drcr_code = 'D' then tran_amt else 0 end) as dr_balance, 
      SUM(case when drcr_code = 'C' then tran_amt else 0 end) as cr_balance 
    from loan.transaction_daily
    where doptor_id = $1 and 
      office_id = $2 and 
      project_id = $3 AND 
      tran_date = $4
    GROUP BY glac_id
    `;

    const params = [doptorId, officeId, projectId, tranDate];

    const { rows: summary } = await transaction.query(sql, params);
    return toCamelKeys(summary) as any[];
  }

  async deleteDailyTransaction(transactionIds: any, transaction: PoolClient) {
    const sql = `
    delete from loan.transaction_daily
     where id  = ANY($1 :: int[])
    `;
    const params = [transactionIds];

    const r12 = await transaction.query(sql, params);
  }
}
