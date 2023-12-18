import { Pool, PoolClient } from "pg";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";

@Service()
export class AccountServices {
  constructor() {}
  async accountStatusCheck(accountId: number, dbConnection: Pool | PoolClient) {
    const accountInfoSql = `SELECT 
                            account_status 
                          FROM 
                            loan.account_info 
                          WHERE 
                            id = $1`;
    const accountInfo = (await dbConnection.query(accountInfoSql, [accountId])).rows[0];

    if (!accountInfo || !accountInfo?.account_status)
      throw new BadRequestError(`সদস্যের অ্যাকাউন্টের তথ্য পাওয়া যায়নি`);
    else if (accountInfo && accountInfo?.account_status == "CLS")
      throw new BadRequestError(`সদস্যের অ্যাকাউন্টটি সচল নেই`);
    else return true;
  }
}
