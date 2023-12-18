/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-01-05 15:36:56
 * @modify date 2023-01-05 15:36:56
 * @desc [description]
 */

import { unionBy } from "lodash";
import { PoolClient } from "pg";
import { buildGetSql } from "rdcd-common";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import TransactionService from "../../../modules/transaction/services/transaction.service";
import { ITransactionAttrs } from "./../../transaction/interfaces/transaction.interface";
import { BalanceMigrationAttrs } from "./../interfaces/balance-migration.interface";

@Service()
export class BalanceMigrationService {
  constructor() {}

  async validateGL(doptorId: number, projectId: number, balance: any) {
    const { queryText, values } = buildGetSql(["id", "gl_nature"], "loan.glac_mst", {
      doptorId,
      id: balance.id,
      glacCode: balance.glCode,
      ...(balance.glName && { glacName: balance.glName }),
    });

    const connection = db.getConnection("slave");

    const { rows } = await connection.query(queryText, values);
    let isExists = rows.length > 0;
    let glNature = rows[0].gl_nature == "D" ? "debitBalance" : "creditBalance";

    //is product gl?
    const { queryText: productGLQuery, values: productGLValues } = buildGetSql(["id"], "loan.product_mst", {
      projectId,
      doptorId,
      product_gl: balance.Id,
    });

    const { rows: productGL } = await connection.query(productGLQuery, productGLValues);

    if (isExists && productGL.length) {
      return await this.validateGLBalance(balance.id, balance.glCode, balance[glNature] || 0);
    }

    return isExists;
  }

  async validateGLBalance(glId: number, glCode: number, balance: number) {
    const sql = `SELECT 
                  A.ID PRODUCT_ID, 
                  A.PRODUCT_GL PRODUCT_GL, 
                  COALESCE (
                    case WHEN a.product_type = 'A' then SUM (
                      CASE WHEN b.drcr_code = 'D' THEN B.TRAN_AMT END
                    )- SUM (
                      CASE WHEN drcr_code = 'C' THEN B.TRAN_AMT END
                    ) WHEN a.product_type = 'L' then SUM (
                      CASE WHEN b.drcr_code = 'C' THEN B.TRAN_AMT END
                    )- SUM (
                      CASE WHEN drcr_code = 'D' THEN B.TRAN_AMT END
                    ) end, 
                    0
                  ) TRAN_AMOUNT 
                FROM 
                  LOAN.PRODUCT_MST A 
                  INNER JOIN LOAN.TRANSACTION_DAILY B ON A.PRODUCT_GL = B.GLAC_ID 
                where 
                  A.PRODUCT_GL = $1 
                group by 
                  A.ID, 
                  A.PRODUCT_GL 
                UNION ALL 
                SELECT 
                  A.ID PRODUCT_ID, 
                  A.PRODUCT_GL PRODUCT_GL, 
                  COALESCE (
                    case WHEN a.product_type = 'A' then SUM (
                      CASE WHEN b.drcr_code = 'D' THEN B.TRAN_AMT END
                    )- SUM (
                      CASE WHEN drcr_code = 'C' THEN B.TRAN_AMT END
                    ) WHEN a.product_type = 'L' then SUM (
                      CASE WHEN b.drcr_code = 'C' THEN B.TRAN_AMT END
                    )- SUM (
                      CASE WHEN drcr_code = 'D' THEN B.TRAN_AMT END
                    ) end, 
                    0
                  ) TRAN_AMOUNT 
                FROM 
                  LOAN.PRODUCT_MST A 
                  INNER JOIN LOAN.TRANSACTION_DTL B ON A.PRODUCT_GL = B.GLAC_ID 
                where 
                  A.PRODUCT_GL = $1
                group by 
                  A.ID, 
                  A.PRODUCT_GL`;

    const params = [glId];
    const connection = db.getConnection("slave");

    const { rows: data } = await connection.query(sql, params);

    let total = 0;
    const productIds: number[] = [];

    data.map((d) => {
      total += parseFloat(d.tran_amount) || 0;
      productIds.push(d.product_id);
    });
    if (total == balance) {
      return true;
    }

    if (productIds.length) {
      const productSQL = `select product_name from loan.product_mst where id in (${unionBy(productIds).toString()})`;

      const { rows } = await connection.query(productSQL);

      const productNames = rows.map((r) => r.product_name);

      return `জিএল কোড - ${glCode}, প্রোডাক্ট - ${productNames.toString()} ব্যালেন্স মিলেনি`;
    }

    return `জিএল কোড - ${glCode}, প্রোডাক্ট পাওয়া যায়নি`;
  }

  async store(
    doptorId: number,
    officeId: number,
    projectId: number,
    userId: number,
    data: BalanceMigrationAttrs[],
    transaction: PoolClient
  ) {
    const generalTransactionService = Container.get(TransactionService);

    const batchNum = await generalTransactionService.generateBatchNumber(transaction);
    const tranNum = await generalTransactionService.generateTransactionNumber(transaction);

    const transactionBalance: ITransactionAttrs[] = data.map((d) => {
      return {
        naration: "migrated balance",
        drcrCode: this.getDCCDCode(d),
        glacId: d.id,
        tranAmt: this.getGLAmount(d),
        tranCode: "MBL",
        tranType: "TRANSFER",
        batchNum,
        tranNum,
      };
    });

    await generalTransactionService.generalTransactionEngine(
      doptorId,
      officeId,
      projectId,
      userId,
      null,
      transactionBalance,
      transaction
    );
  }

  getGLAmount(data: any) {
    const type = parseInt(data.gl_code.toString()[0]);

    return type == 1 || type == 4 ? data.debit_balance : data.credit_balance;
  }

  getDCCDCode(data: any) {
    const type = parseInt(data.gl_code.toString()[0]);
    return type == 1 || type == 4 ? "D" : "C";
  }
}
