import Container, { Service } from "typedi";
import { Pool, PoolClient } from "pg";
import { toCamelKeys } from "keys-transform";
import { Moment } from "moment-timezone";
import db from "../../../db/connection.db";

@Service()
export class ReverseTranService {
  constructor() {}
  //reverse data check from front end
  async reverseRequstInfo(doptorId: number, officeId: number, tranNumber: string, tranDate: Moment) {
    const pool = db.getConnection("slave");

    const reverseRequstSql = `SELECT b.product_name     product_name,
                                      c.account_title    account_title,
                                      d.glac_name,
                                      a.account_id       account_id,
                                      a.product_id       product_id,
                                      a.tran_date        tran_date,
                                      a.tran_num         tran_num,
                                      a.tran_code        tran_code,
                                      CASE
                                          WHEN a.drcr_code = 'D' THEN 'ডেবিট'
                                          WHEN a.drcr_code = 'C' THEN 'ক্রেডিট '
                                      END                drcr_code,
                                      a.tran_amt         tran_amt,
                                      a.glac_id          glac_id,
                                      a.subgl_id         subgl_id,
                                      a.cheque_num       cheque_num,
                                      a.cheque_date      cheque_date,
                                      a.bank_id          bank_id,
                                      a.branch_id        branch_id,
                                      a.naration         naration
                                  FROM (SELECT account_id,
                                      product_id,
                                      tran_date,
                                      tran_num,
                                      tran_code,
                                      drcr_code,
                                      tran_amt,
                                      glac_id,
                                      subgl_id,
                                      cheque_num,
                                      cheque_date,
                                      bank_id,
                                      branch_id,
                                      naration
                                  FROM loan.transaction_dtl
                                  WHERE     doptor_id = $1
                                  AND office_id = $2
                                  AND tran_num = $3
                                  AND tran_date = $4
                                  AND tran_code <>'IND'
                                  UNION ALL
                                  SELECT account_id,
                                      product_id,
                                      tran_date,
                                      tran_num,
                                      tran_code,
                                      drcr_code,
                                      tran_amt,
                                      glac_id,
                                      subgl_id,
                                      cheque_num,
                                      cheque_date,
                                      bank_id,
                                      branch_id,
                                      naration
                                  FROM loan.transaction_daily
                                  WHERE     doptor_id = $1
                                  AND office_id = $2
                                  AND tran_num = $3
                                  AND tran_date = $4
                                  AND tran_code <>'IND') a
                                  INNER JOIN loan.product_mst b ON a.product_id = b.id
                                  LEFT JOIN loan.account_info c ON a.account_id = c.id
                                LEFT JOIN loan.glac_mst d ON a.glac_id = d.id`;

    let reverseRequstData = (
      await pool.query(reverseRequstSql, [doptorId, officeId, tranNumber, tranDate.format("DD/MM/YYYY")])
    ).rows;

    let margeTranTypeData = { reverseRequstData: [] } as any;
    if (reverseRequstData.length > 0) {
      const tranTypeSql = `SELECT id
    FROM master.code_master
    WHERE code_type='TRP'
    AND return_value=$1`;
      let tranTypeData = (await pool.query(tranTypeSql, [reverseRequstData[0].tran_code])).rows[0];
      margeTranTypeData = { reverseRequstData, tranTypeId: tranTypeData.id };
    }

    return margeTranTypeData ? toCamelKeys(margeTranTypeData) : {};
  }
}
