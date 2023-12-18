import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildInsertSql, buildSql, buildUpdateWithWhereSql } from "rdcd-common";
import lodash, { floor } from "lodash";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import moment from "moment";
import TranDocGenerationService from "../../../modules/transaction/services/tran-doc-generation.service";
import TransactionService from "../../../modules/transaction/services/transaction.service";
// import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";

@Service()
export default class FdrService {
  constructor() {}
  /////  Fetch FDR details Data for an particuler account //////////
  async getAccountDetails(accountId: number) {
    let today = new Date();
    let profitAmount;
    const pool = db.getConnection("slave");
    const accountDetailsSql = `SELECT 
                                a.fdr_duration, 
                                a.eff_date, 
                                a.exp_date, 
                                a.fdr_amt, 
                                a.int_rate,
                                a.profit_amt,
                                c.current_balance,
                                d.id product_id,
                                d.product_name
                            FROM 
                                loan.fdr_mst a 
                                INNER JOIN loan.account_info b ON a.account_id = b.id 
                                INNER JOIN loan.account_balance c ON b.id = c.account_id 
                                INNER JOIN loan.product_mst d ON d.id =a.product_id
                            WHERE 
                                a.account_id = $1
                                AND b.account_status = 'ACT'`;
    let singleFdrAccountDetails = (await pool.query(accountDetailsSql, [accountId]))?.rows[0];
    if (moment(today).isBefore(moment(singleFdrAccountDetails.exp_date))) {
      const differenceInYear = moment(today).diff(moment(singleFdrAccountDetails.eff_date), "months");
      let calculatedMonths = Number(Math.floor(differenceInYear / 12) * 12);
      if (calculatedMonths < 12) {
        profitAmount = 0;
      } else {
        const intRateSql = "select int_rate FROM loan.product_interest WHERE product_id =$1 AND time_period=$2";
        let interestRate = (await pool.query(intRateSql, [singleFdrAccountDetails.product_id, calculatedMonths]))
          .rows[0].int_rate;
        let years = calculatedMonths / 12;
        profitAmount = Number(singleFdrAccountDetails.fdr_amt) * Number(Number(interestRate) / Number(100)) * years;
      }
    } else {
      profitAmount = singleFdrAccountDetails.profit_amt;
    }
    singleFdrAccountDetails = { ...singleFdrAccountDetails, profitAmount: profitAmount };
    return singleFdrAccountDetails ? toCamelKeys(singleFdrAccountDetails) : [];
  }
  ///////// All transection and db update when fdr closed//////
  async makeFdrClose(
    applicationData: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    createdBy: number,
    client: PoolClient
  ) {
    console.log({ applicationData });

    const tranDocGenerationService: TranDocGenerationService = Container.get(TranDocGenerationService);
    const transactionService: TransactionService = Container.get(TransactionService);
    const productSql = `SELECT product_gl,provision_debit_gl FROM loan.product_mst WHERE id = $1`;
    const productInfo = (await client.query(productSql, [applicationData.productId])).rows[0];
    const cashInHandGlSql = `SELECT 
                                id 
                              FROM 
                                loan.glac_mst 
                              WHERE 
                                doptor_id = $1
                                AND is_cash_in_hand = true 
                                AND parent_child = 'C'`;
    const cashInHandGl = (await client.query(cashInHandGlSql, [doptorId])).rows;
    if (cashInHandGl.length == 0)
      throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে 
      হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া যায়নি`);
    if (cashInHandGl.length > 1)
      throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া গেছে`);

    const accountBalanceSql = `SELECT 
                                current_balance
                              FROM 
                                loan.account_balance 
                              WHERE 
                                account_id = $1`;
    const accountBalance = (await client.query(accountBalanceSql, [applicationData.customerAcc])).rows[0];
    const batchNum = await tranDocGenerationService.generateBatchNumber(client);
    const profitTranNum = await tranDocGenerationService.generateTransactionNumber(client);
    const fdrCloseTranNum = await tranDocGenerationService.generateTransactionNumber(client);
    console.log({
      key: applicationData.givenProfitAmount,
      Key2: applicationData.fdrAmount + applicationData.givenProfitAmount,
    });

    const transactionSets = [
      {
        productId: applicationData.productId,
        accountId: applicationData.accountId,
        naration: "Fdr Close profit credit transaction",
        drcrCode: "C",
        glacId: productInfo.product_gl,
        tranAmt: Number(applicationData.givenProfitAmount),
        batchNum,
        tranNum: profitTranNum,
        tranCode: "CLS",
        tranType: "CASH",
      },
      {
        productId: applicationData.productId,
        naration: "Fdr Close profit debit transaction",
        drcrCode: "D",
        glacId: productInfo.provision_debit_gl,
        tranAmt: Number(applicationData.givenProfitAmount),
        batchNum,
        tranNum: profitTranNum,
        tranCode: "CLS",
        tranType: "CASH",
      },
      {
        productId: applicationData.productId,
        accountId: applicationData.accountId,
        naration: "Fdr Close Debit transaction",
        drcrCode: "D",
        glacId: productInfo.product_gl,
        tranAmt: Number(applicationData.fdrAmount) + Number(applicationData.givenProfitAmount),
        batchNum,
        tranNum: fdrCloseTranNum,
        tranCode: "CLS",
        tranType: "CASH",
      },
      {
        productId: applicationData.productId,
        naration: "Fdr Close credit transaction",
        drcrCode: "C",
        glacId: cashInHandGl[0].id,
        tranAmt: Number(applicationData.fdrAmount) + Number(applicationData.givenProfitAmount),
        batchNum,
        tranNum: fdrCloseTranNum,
        tranCode: "CLS",
        tranType: "CASH",
      },
    ];

    const result = await transactionService.generalTransactionEngine(
      doptorId,
      officeId,
      projectId,
      createdBy,
      productInfo.deposit_nature,
      transactionSets,
      client
    );

    const { sql: accountInfoSql, params: accountInfoParams } = buildUpdateWithWhereSql(
      "loan.account_info",
      { id: applicationData.accountId },
      {
        accountStatus: "CLS",
        closeBy: createdBy,
        closeDate: new Date(),
        updatedBy: createdBy,
        updatedAt: new Date(),
      }
    );

    const accInfoRes = (await client.query(accountInfoSql, accountInfoParams)).rows[0];

    // const { sql: accountBalanceUpdateSql, params: accountBalanceUpdateParams } = buildUpdateWithWhereSql(
    //   "loan.account_balance",
    //   { accountId: applicationData.customerAcc },
    //   {
    //     currentBalance: 0,
    //     updatedBy: createdBy,
    //     updatedAt: new Date(),
    //   }
    // );

    // const accBalanceRes = (await client.query(accountBalanceUpdateSql, accountBalanceUpdateParams)).rows[0];

    return accInfoRes;
  }
}
