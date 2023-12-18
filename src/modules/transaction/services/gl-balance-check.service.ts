import { Pool, PoolClient } from "pg";
import { Service } from "typedi";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";

@Service()
export default class GlBalanceCheckService {
  constructor() {}
  async getGlNameById(glId: Number, transaction: Pool | PoolClient) {
    const sql = `select glac_name from loan.glac_mst where id = $1`;
    const glName = await (await transaction.query(sql, [glId])).rows[0].glac_name;
    return glName;
  }
  async checkIsGlBalanceNegative(
    glId: Number,
    drcrCode: string | undefined,
    tranAmmount: Number,
    officeId: Number,
    transaction: PoolClient | Pool,
    projectId: Number | undefined
  ) {
    try {
      const glInfoSql = `SELECT id, gl_nature, glac_name         
                     FROM loan.glac_mst
                     WHERE id = $1 AND parent_child = $2`;

      const { id, gl_nature, glac_name } = await (await transaction.query(glInfoSql, [glId, "C"])).rows[0];
      if (gl_nature !== drcrCode) {
        if (gl_nature === "C") {
          const sumSql = `select COALESCE(sum(a.balance),0) as glBalance from (SELECT SUM (a.credit_amt)  -  SUM (a.debit_amt) as balance                  
          FROM loan.gl_summary a
          WHERE a.office_id = $1
          AND a.glac_id= $2 ${projectId ? "AND a.project_id = $3" : ""}
          UNION	
          SELECT SUM (
                        case
                        when b.drcr_code = 'D'
                        then b.tran_amt
                        else 0
                  end
                  )                 
                 -SUM (
                       case 
                       when b.drcr_code ='C'
                       then b.tran_amt
                       else 0
                 end
                ) as balance     
                       FROM loan.transaction_daily b
                       WHERE b.office_id = $1
                       AND b.glac_id = $2 ${projectId ? "AND b.project_id = $3" : ""}) a`;
          const { sum } = await (
            await transaction.query(sumSql, projectId ? [officeId, glId, projectId] : [officeId, glId])
          ).rows[0];
          if (Number(sum.glbalance) < Number(tranAmmount)) {
            const glName = await this.getGlNameById(Number(glId), transaction);
            return {
              status: false,
              message: `অপর্যাপ্ত লেজার (${glName}) ব্যালেন্স (${numberToWord(sum.glbalance)})`,
            };
          } else {
            return {
              status: true,
              message: ``,
            };
          }
        } else if (gl_nature === "D") {
          const sumSql = `select COALESCE(sum(a.balance),0) as glBalance from (SELECT SUM (a.debit_amt)  -  SUM (a.credit_amt) as balance                  
          FROM loan.gl_summary a
          WHERE a.office_id = $1
          AND a.glac_id= $2 ${projectId ? "AND a.project_id = $3" : ""}
          UNION	
          SELECT SUM (
                        case
                        when b.drcr_code = 'D'
                        then b.tran_amt
                        else 0
                  end
                  )                 
                 -SUM (
                       case 
                       when b.drcr_code ='C'
                       then b.tran_amt
                       else 0
                 end
                ) as balance     
                       FROM loan.transaction_daily b
                       WHERE b.office_id = $1
                       AND b.glac_id = $2 ${projectId ? "AND b.project_id = $3" : ""}) a`;
          const sum = await (
            await transaction.query(sumSql, projectId ? [officeId, glId, projectId] : [officeId, glId])
          ).rows[0];
          if (Number(sum.glbalance) < Number(tranAmmount)) {
            const glName = await this.getGlNameById(Number(glId), transaction);
            return {
              status: false,
              message: `অপর্যাপ্ত লেজার (${glName}) ব্যালেন্স (${numberToWord(sum.glbalance)})`,
            };
          } else {
            return {
              status: true,
              balance: Number(sum.glbalance),
              message: ``,
            };
          }
        }
      } else {
        return {
          status: true,
          // balance:Number(sum.glbalance),
          message: ``,
        };
      }
    } catch (error) {
      console.log("error", error);
    }
  }
}
