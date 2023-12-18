/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-30 15:47:42
 * @modify date 2022-08-30 15:47:42
 * @desc [description]
 */

import { PoolClient } from "pg";
import { Service } from "typedi";

@Service()
export class TransactionDetailService {
  constructor() {}

  async detailTransactionIsBalanced(
    doptorId: number,
    officeId: number,
    projectId: number,
    transaction: PoolClient
  ) {
    const query = `
         select SUM(case when drcr_code = 'D' then tran_amt else 0 end) as dr_balance, 
         SUM(case when drcr_code = 'C' then tran_amt else 0 end) as cr_balance from loan.transaction_dtl
         where doptor_id = $1 and office_id = $2 and project_id = $3;
         `;
    const params = [doptorId, officeId, projectId];

    const {
      rows: [{ cr_balance, dr_balance }],
    } = await transaction.query(query, params);

    return cr_balance == dr_balance;
  }
}
