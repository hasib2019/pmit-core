import { toCamelKeys, toSnakeCase } from "keys-transform";
import lodash from "lodash";
import moment, { Moment } from "moment-timezone";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import { TransactionApplicationService } from "../../../modules/application/services/transaction-application.service";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { IMakeRepaymentSequence, ITransactionAttrs } from "../interfaces/transaction.interface";
import { DayOpenCloseService } from "./day-open-close.service";
import DpsService from "../../../modules/savings/services/dps.service";
import { BadRequestError } from "rdcd-common";
import { HolidayInfoServices } from "../../../modules/accounts/services/holiday.service";
import { RepaymentTranService } from "./repayment.service";

@Service()
export default class TransactionService {
  constructor() {}

  async leftPadding(number: any, length: any) {
    let len = length - ("" + number).length;
    return (len > 0 ? new Array(++len).join("0") : "") + number;
  }

  //generate transaction number
  async generateTransactionNumber(transaction: Pool | PoolClient) {
    const tranNumSql = `SELECT NEXTVAL('loan.tran_num_seq') tran_num`;
    const transactionNumber = `TR${await this.leftPadding((await transaction.query(tranNumSql)).rows[0].tran_num, 6)}`;
    return transactionNumber;
  }

  //generate Batch number
  async generateBatchNumber(transaction: Pool | PoolClient) {
    const batchNumSql = `SELECT NEXTVAL('loan.batch_num_seq') batch_num`;
    const batchNum = (await transaction.query(batchNumSql)).rows[0].batch_num;
    const batchNumber = `BH${await this.leftPadding(batchNum, 6)}`;
    return batchNumber;
  }
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
              message: ``,
            };
          }
        }
      } else {
        return {
          status: true,
          message: ``,
        };
      }
    } catch (error) {}
  }
  //general Transaction Engine
  async generalTransactionEngine(
    doptorId: number,
    officeId: number,
    projectId: number,
    userId: number,
    productDepositNature: "L" | "R" | "S" | null,
    transactionSets: ITransactionAttrs[],
    transaction: Pool | PoolClient
  ) {
    // Party account active?
    // If debit transaction then check party account have enough balance
    // Gl negative balance checking

    const allDebitTransaction = transactionSets.filter(
      (value: any) => value.drcrCode == "D" && value.tranCode != "IND"
    );
    const allCreditTransaction = transactionSets.filter((value: any) => value.drcrCode == "C");
    const allDebitAmounts = allDebitTransaction.map((value: any) => Number(value.tranAmt));
    const allCreditAmounts = allCreditTransaction.map((value: any) => Number(value.tranAmt));
    const allDebitAmountsTotal = allDebitAmounts.reduce((sum: number, number: number) => sum + number, 0);
    const allCreditAmountsTotal = allCreditAmounts.reduce((sum: number, number: number) => sum + number, 0);

    if (allDebitAmountsTotal != allCreditAmountsTotal) throw new BadRequestError(`ডেবিট ও ক্রেডিটের পরিমাণ সমান নেই`);

    const dayOpenCloseService: DayOpenCloseService = Container.get(DayOpenCloseService);
    const transactionDate = await dayOpenCloseService.getOpenDate(
      undefined,
      doptorId,
      officeId,
      projectId,
      transaction
    );
    if (!transactionDate || !transactionDate.openCloseDate) {
      throw new BadRequestError(`লেনদেন সংঘটিত হওয়ার তারিখ পাওয়া যায়নি`);
    }

    let allResults = [] as any;

    const accountInfoSql = `SELECT 
                              a.account_status,
                              b.current_balance, 
                              c.product_type 
                            FROM 
                              loan.account_info a 
                              INNER JOIN loan.account_balance b ON b.account_id = a.id 
                              INNER JOIN loan.product_mst c ON c.id = a.product_id 
                            WHERE 
                              a.id = $1`;
    for (const singleSet of transactionSets) {
      if (singleSet.accountId) {
        let accountInfo = (await transaction.query(accountInfoSql, [singleSet.accountId])).rows[0];
        if (accountInfo.account_status && accountInfo.account_status != "ACT")
          throw new BadRequestError(`লেনদেনের একাউন্ট সচল নয়`);

        if (
          singleSet.drcrCode &&
          singleSet.tranAmt &&
          productDepositNature &&
          accountInfo.current_balance &&
          singleSet.drcrCode === "D" &&
          productDepositNature != "L" &&
          Number(singleSet.tranAmt) > Number(accountInfo.current_balance)
        ) {
          throw new BadRequestError(`একাউন্টে পর্যাপ্ত টাকা নেই`);
        }
        let currentBalance = Number(accountInfo?.current_balance) || 0;

        if (!accountInfo?.product_type) throw new BadRequestError(`প্রোডাক্টের ধরণ উল্লেখ করা নেই`);

        if (accountInfo.product_type == "A" && singleSet.tranCode != "IND") {
          const tranC = singleSet.tranCode;
          currentBalance =
            currentBalance - Number(singleSet.tranAmt) < 0
              ? tranC == "LDG"
                ? currentBalance + Number(singleSet.tranAmt)
                : (currentBalance - Number(singleSet.tranAmt)) * -1
              : tranC == "REP"
              ? currentBalance - Number(singleSet.tranAmt)
              : currentBalance + Number(singleSet.tranAmt);
        } else if (accountInfo.product_type == "L") {
          if (singleSet.drcrCode == "D" && singleSet.tranCode != "IND")
            currentBalance = currentBalance - Number(singleSet.tranAmt);
          else if (singleSet.drcrCode == "C") currentBalance = currentBalance + Number(singleSet.tranAmt);
          else throw new BadRequestError("ডেবিট/ক্রেডিট সঠিকভাবে উল্লেখ করুন");
        }

        const { sql: accBalanceUpdateSql, params: accBalanceUpdateParams } = buildUpdateWithWhereSql(
          "loan.account_balance",
          { accountId: Number(singleSet.accountId) },
          {
            currentBalance,
            updatedBy: userId,
            updatedAt: new Date(),
          }
        );
        let accountBalanceUpdate = transaction.query(accBalanceUpdateSql, accBalanceUpdateParams);
      }
      // transaction daily table insert
      let { sql, params } = buildInsertSql("loan.transaction_daily", {
        doptorId,
        officeId,
        ...lodash.omit(singleSet, ["glacName", "tranDate"]),
        tranDate: singleSet?.tranDate ? singleSet.tranDate : transactionDate?.openCloseDate,
        valDate: new Date(),
        authorizeStatus: "A",
        createdBy: userId,
        createdAt: new Date(),
        ...(projectId && { projectId }),
      });

      let result = await (await transaction.query(sql, params)).rows[0];
      allResults.push(result);
    }

    return allResults.length > 0 ? toCamelKeys(allResults) : [];
  }

  /**
   * from account
   * @author @ziaurrahaman
   */

  async interOfficeTransactionEngine(
    doptorId: number,
    officeId: number,
    userId: number,
    projectId: number,
    productDepositNature: "L" | "R" | "S" | null,
    transactionSets: ITransactionAttrs[],
    transaction: PoolClient
  ) {
    // Party account active?
    // If debit transaction then check party account have enough balance
    // Gl negative balance checking
    try {
      const transactionService: TransactionApplicationService = Container.get(TransactionApplicationService);

      for (const element of transactionSets) {
        const checkResult = await transactionService.checkIsGlBalanceNegative(
          Number(element.glacId),
          element?.drcrCode ? element.drcrCode : null,
          Number(element.tranAmt),
          officeId,
          transaction,
          projectId ? projectId : undefined
        );
        if (!checkResult?.status) {
          throw new BadRequestError(checkResult?.message);
        }
        // return;
      }
      const allDebitTransaction = transactionSets.filter((value: any) => value.drcrCode == "D");
      const allCreditTransaction = transactionSets.filter((value: any) => value.drcrCode == "C");

      const allDebitAmounts = allDebitTransaction.map((value: any) => value.tranAmt);
      const allCreditAmounts = allCreditTransaction.map((value: any) => value.tranAmt);

      const allDebitAmountsTotal = allDebitAmounts.reduce((sum: number, number: number) => sum + number, 0);
      const allCreditAmountsTotal = allCreditAmounts.reduce((sum: number, number: number) => sum + number, 0);

      if (allDebitAmountsTotal != allCreditAmountsTotal) throw new BadRequestError(`ডেবিট ও ক্রেডিটের পরিমাণ সমান নেই`);
      const dayOpenCloseService: DayOpenCloseService = Container.get(DayOpenCloseService);
      let transactionDate = null;
      transactionDate = await dayOpenCloseService.getOpenDate(undefined, doptorId, officeId, projectId, transaction);

      if (!transactionDate || !transactionDate.openCloseDate)
        throw new BadRequestError(`লেনদেন সংঘটিত হওয়ার তারিখ পাওয়া যায়নি`);
      let allResults = [] as any;
      const balanceCheckSql = `SELECT 
                                b.account_status, 
                                a.current_balance 
                              FROM 
                                loan.account_balance a 
                                INNER JOIN loan.account_info b ON a.account_id = b.id 
                              WHERE 
                              b.id = $1`;

      const generalHeadSql = "select * from loan.glac_mst where is_general_head = true and doptor_id = $1";
      let generalHeadResult = await (await transaction.query(generalHeadSql, [doptorId])).rows;
      if (generalHeadResult.length == 0) {
        throw new BadRequestError("জেনারেল হেড বিদ্যমান নেই");
      }

      for (const singleSet of transactionSets) {
        let { sql, params } = buildInsertSql("loan.transaction_daily", {
          doptorId,
          officeId,

          ...lodash.omit(singleSet, ["glacName"]),
          tranCode: "IBT",
          tranDate: transactionDate.openCloseDate,
          valDate: new Date(),
          authorizeStatus: "A",
          createdBy: userId,
          createdAt: new Date(),
        });
        let result = await (await transaction.query(sql, params)).rows[0];
        allResults.push(result);
        let { sql: gneralHeadInsertSql, params: gneralHeadInsertParams } = buildInsertSql("loan.transaction_daily", {
          doptorId,
          officeId,

          ...lodash.omit(singleSet, ["glacName", "glacId"]),
          tranCode: "IBT",
          naration: "Contra Transaction In General Head",
          glacId: generalHeadResult[0]?.id,
          drcrCode: singleSet.drcrCode == "C" ? "D" : "C",
          tranDate: transactionDate.openCloseDate,
          valDate: new Date(),
          authorizeStatus: "A",
          createdBy: userId,
          createdAt: new Date(),
        });

        let generalHeadInsertResult = await (
          await transaction.query(gneralHeadInsertSql, gneralHeadInsertParams)
        ).rows[0];
      }
      return allResults.length > 0 ? toCamelKeys(allResults) : [];
    } catch (ex: any) {
      const msg = ex.toString().split(":");
      throw new BadRequestError(msg[1]);
    }
  }

  // create transaction
  async create(data: ITransactionAttrs): Promise<ITransactionAttrs | undefined> {
    const client: PoolClient = await db.getConnection("master").connect();
    try {
      await client.query("BEGIN");
      let result;
      let batchNum = await this.generateBatchNumber(client);
      const productInfoSql = `SELECT 
                                product_type, 
                                deposit_nature 
                              FROM 
                                loan.product_mst 
                              WHERE 
                                id = $1`;
      // const actionStatus = data.actionType ? data.actionType : null;
      for (const singleTrnData of (data as any).productDetails) {
        // for all type of transaction like DEP/REP/DPS singleTrnData contains {accountId:12,productId:215,tranAmt:500}
        const productType = (await client.query(productInfoSql, [singleTrnData.productId])).rows[0]?.product_type;
        const depositNature = (await client.query(productInfoSql, [singleTrnData.productId])).rows[0]?.deposit_nature;
        if (!productType || !depositNature) {
          throw new BadRequestError("প্রোডাক্টের তথ্য পাওয়া যায় নি।");
        }
        if (productType == "A" && depositNature == "L") {
          const repaymentTranService: RepaymentTranService = Container.get(RepaymentTranService);

          result = await repaymentTranService.createRepayment(
            singleTrnData,
            data.doptorId as number,
            data.officeId as number,
            data.projectId as number,
            batchNum as string,
            data.tranType as string,
            { gl: [], account: [] },
            data.createdBy as number,
            client
          );
        } else if (productType == "L" && depositNature == "R") {
          result = await this.makeSavingsDeposit(
            singleTrnData,
            data.doptorId as number,
            data.officeId as number,
            data.projectId as number,
            batchNum as string,
            data.createdBy as number,
            client
          );
        } else if (productType == "L" && depositNature == "S") {
          result = await this.makeShareDeposit(
            singleTrnData,
            data.doptorId as number,
            data.officeId as number,
            data.projectId as number,
            batchNum as string,
            data.createdBy as number,
            client
          );
        } else if (productType == "L" && depositNature == "C") {
          result = await this.makeDpsDeposit(
            singleTrnData,
            data.doptorId as number,
            data.officeId as number,
            data.projectId as number,
            batchNum as string,
            data.createdBy as number,
            client
          );
        } else {
          throw new BadRequestError(`লেনদেনে ত্রুটি হয়েছে`);
        }
      }
      await client.query("COMMIT");
      return result ? (result as any) : [];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  //get product info
  async getProductList(doptorId: number, officeId: number, projectId: number, samityId: number) {
    const pool = db.getConnection("slave");
    let sql;
    sql = `SELECT 
            a.id customer_id, 
            a.customer_code member_code, 
            a.name_bn member_name, 
            b.id account_id, 
            c.id product_id, 
            c.product_name, 
            c.default_amt, 
            c.product_gl,
            c.deposit_nature 
          FROM 
            samity.customer_info a 
            INNER JOIN loan.account_info b ON a.id = b.customer_id 
            AND a.doptor_id = b.doptor_id 
            AND a.project_id = b.project_id 
            INNER JOIN loan.product_mst c ON a.doptor_id = c.doptor_id 
            AND a.project_id = c.project_id 
            AND b.product_id = c.id 
          WHERE 
            a.doptor_id = $1 
            AND a.project_id = $2 
            AND a.samity_id = $3 
            AND b.account_status = 'ACT'
            AND c.is_active = true
            AND c.deposit_nature != 'F'
          ORDER BY a.id ASC`;
    const result = (await pool.query(sql, [doptorId, projectId, samityId])).rows;
    let finalData = [];
    let setData: any = {};

    const productDetailsSql = `SELECT deposit_nature FROM loan.product_mst WHERE id = $1`;
    const dpsService: DpsService = Container.get(DpsService);
    for (const [i, v] of result.entries()) {
      setData = {
        customerId: v.customer_id,
        memberCode: v.member_code,
        memberName: v.member_name,
        depositNature: v.deposit_nature,
        productDetails: [],
      };

      const result2 = result.filter((obj: { customer_id: number }) => obj.customer_id == v.customer_id);
      const getAccountWiseLoanAmountSql = `SELECT 
                                        COALESCE(
                                          SUM(total_amount), 
                                          0
                                        ) total_amount 
                                      FROM 
                                        loan.schedule_info 
                                      WHERE 
                                        account_id = $1 
                                        AND due_date <= CURRENT_DATE
                                        AND is_payment_complete = false`;

      for (const value of result2) {
        let dpsPayableAmounts: number[] = [];
        if (value?.deposit_nature == "C") {
          dpsPayableAmounts = await dpsService.getRepaymentAmount(
            value.account_id,
            value.product_id,
            doptorId,
            officeId
          );
        }
        let productDepositNature = (await pool.query(productDetailsSql, [value.product_id])).rows[0]?.deposit_nature;
        if (!productDepositNature) throw new BadRequestError(`প্রোডাক্টের তথ্য পাওয়া যায়নি`);
        let totalAmount = null;
        if (productDepositNature && productDepositNature == "L") {
          totalAmount = (await pool.query(getAccountWiseLoanAmountSql, [value.account_id])).rows[0].total_amount;
        }
        let depositAmt: string;
        if (totalAmount && Number(totalAmount) >= 0) depositAmt = totalAmount.toString();
        else if (value?.deposit_nature == "C") {
          if (dpsPayableAmounts.includes(0)) depositAmt = "0";
          else depositAmt = dpsPayableAmounts.toString();
        } else depositAmt = value?.default_amt ? value.default_amt.toString() : "0";
        setData.productDetails.push({
          accountId: value.account_id,
          productId: value.product_id,
          productName: value.product_name,
          depositAmt,
          glacId: value.product_gl,
        });
      }
      if (i != 0 && result[i - 1] && result[i - 1].customer_id == v.customer_id) continue;
      else finalData.push(setData);
    }
    return finalData[0] ? toCamelKeys(finalData) : [];
  }

  //get value date
  async getValDate(transaction: PoolClient) {
    //const pool = db.getConnection("slave");
    let sql;
    sql = `SELECT 
            open_close_date
          FROM 
            loan.day_open_close
          WHERE 
          open_close_flag = true`;
    const result = (await transaction.query(sql)).rows[0].open_close_date;
    return result ? result : undefined;
  }

  //principal balance update
  async makePrincipalBalance(pTranAmt: number, scheduleData: any) {
    let principalPaidAmount = 0;
    if (pTranAmt < scheduleData.principal_due) {
      principalPaidAmount = pTranAmt;
      pTranAmt = 0;
    } else if (pTranAmt == scheduleData.principal_due) {
      principalPaidAmount = pTranAmt;
      pTranAmt = 0;
    } else if (pTranAmt > scheduleData.principal_due) {
      principalPaidAmount = scheduleData.principal_due;
      pTranAmt -= scheduleData.principal_due;
    }

    return { principalPaidAmount, pTranAmt };
  }

  //service charge balance update
  async makeServiceChargeBalance(sTranAmt: number, scheduleData: any) {
    let interestPaidAmount = 0;
    if (sTranAmt < scheduleData.charge_due) {
      interestPaidAmount = sTranAmt;
      sTranAmt = 0;
    } else if (sTranAmt == scheduleData.charge_due) {
      interestPaidAmount = sTranAmt;
      sTranAmt = 0;
    } else if (sTranAmt > scheduleData.charge_due) {
      interestPaidAmount = scheduleData.charge_due;
      sTranAmt -= scheduleData.charge_due;
    }

    return { interestPaidAmount, sTranAmt };
  }

  //deposit transaction
  async makeSavingsDeposit(
    data: any, //type object
    doptorId: number,
    officeId: number,
    projectId: number,
    batchNum: string,
    createdBy: number,
    client: PoolClient
  ) {
    const productSql = `SELECT product_gl, deposit_nature FROM loan.product_mst WHERE id = $1`;
    const productInfo = (await client.query(productSql, [data.productId])).rows[0];
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

    const tranNum = await this.generateTransactionNumber(client);

    const transactionSets = [
      {
        projectId,
        productId: data.productId,
        accountId: data.accountId,
        naration: "Deposit transaction to member savings account",
        drcrCode: "C",
        tranNum,
        glacId: productInfo.product_gl,
        tranAmt: data.tranAmt,
        batchNum,
        tranCode: "DEP",
        tranType: "CASH",
      },
      {
        projectId,
        productId: data.productId,
        accountId: null,
        naration: "Cash in hand transaction for member deposit",
        drcrCode: "D",
        glacId: cashInHandGl[0]?.id,
        tranAmt: data.tranAmt,
        batchNum,
        tranNum,
        tranCode: "DEP",
        tranType: "CASH",
      },
    ];

    const result = await this.generalTransactionEngine(
      doptorId,
      officeId,
      projectId,
      createdBy,
      productInfo.deposit_nature,
      transactionSets,
      client
    );

    return result;
  }

  //share account transaction
  async makeShareDeposit(
    data: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    batchNum: string,
    createdBy: number,
    client: PoolClient
  ) {
    //****************************************************************** */
    //need to more work on share account deposit
    //***************************************************************** */

    const productSql = `SELECT product_gl, deposit_nature FROM loan.product_mst WHERE id = $1`;
    const productInfo = (await client.query(productSql, [data.productId])).rows[0];
    const cashInHandGlSql = `SELECT 
                              id 
                            FROM 
                              loan.glac_mst 
                            WHERE 
                              is_cash_in_hand = true 
                              AND doptor_id = $1`;
    const cashInHandGl = (await client.query(cashInHandGlSql, [doptorId])).rows[0].id;
    const tranNum = await this.generateTransactionNumber(client);
    const transactionSets = [
      {
        productId: data.productId,
        accountId: data.accountId,
        naration: "Deposit to member share account",
        drcrCode: "C",
        glacId: productInfo.product_gl,
        tranAmt: data.tranAmt,
        batchNum,
        tranNum,
        tranCode: "SHR",
        tranType: "CASH",
      },
      {
        productId: data.productId,
        accountId: null,
        naration: "Deposit to member share account",
        drcrCode: "D",
        glacId: cashInHandGl,
        tranAmt: data.tranAmt,
        batchNum,
        tranNum,
        tranCode: "SHR",
        tranType: "CASH",
      },
    ];

    const result = await this.generalTransactionEngine(
      doptorId,
      officeId,
      projectId,
      createdBy,
      productInfo.deposit_nature,
      transactionSets,
      client
    );

    return result;
  }
  ////////////// Dps repayment transection set update for every repayment in an particuler account///////
  async nextWorkingDay(
    date: Moment,
    doptorId: number,
    officeId: number,
    installmentType: "M" | "W"
  ): Promise<moment.Moment> {
    const newDate = moment(date);

    const holidayService = Container.get(HolidayInfoServices);
    if (
      !(await holidayService.isHoliday({
        date,
        doptorId,
        officeId,
      }))
    ) {
      return newDate;
    }
    if ((installmentType = "M")) {
      newDate.add(1, "month");
    }
    if ((installmentType = "W")) {
      newDate.add(1, "week");
    }
    return await this.nextWorkingDay(newDate, doptorId, officeId, installmentType);
  }

  async makeDpsDeposit(
    data: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    batchNum: string,
    createdBy: number,
    client: PoolClient
  ) {
    const dpsService: DpsService = Container.get(DpsService);
    const dpsPayableAmounts = await dpsService.getRepaymentAmount(data.accountId, data.productId, doptorId, officeId);
    const dpsInfoSql = `SELECT deposit_amt,total_ins,next_ins_start_date,next_ins_end_date,paid_ins FROM loan.time_deposit_mst WHERE account_id = $1`;
    const dpsInfo = (await client.query(dpsInfoSql, [data.accountId])).rows[0];
    const getCurrentBalSql = `SELECT
                                  current_balance
                                FROM
                                  loan.account_balance
                                WHERE
                                  account_id = $1`;
    let getCurrentBal = (await client.query(getCurrentBalSql, [data.accountId])).rows[0];
    let dueMonthCalculationSql = `SELECT 
                                      a.deposit_amt, 
                                      a.total_ins, 
                                      a.ins_start_date,  
                                      a.last_ins_paid_date, 
                                      a.maturity_date, 
                                      c.maturity_max_day,
                                      g.ins_failed_number 
                                    FROM 
                                      loan.time_deposit_mst a 
                                      INNER JOIN loan.product_mst c ON a.product_id = c.id 
                                      INNER JOIN loan.account_info d ON a.account_id = d.id 
                                      INNER JOIN loan.product_interest g ON g.product_id = a.product_id 
                                      AND g.ins_amt = a.deposit_amt 
                                      AND g.time_period = a.time_period 
                                    WHERE 
                                      d.id = $1 
                                      AND d.account_status = 'ACT' 
                                      AND a.product_id = $2 `;
    let getInstallmentFailedNumber = (await client.query(dueMonthCalculationSql, [data.accountId, data.productId]))
      .rows[0];
    let lastInsPaidDate = getInstallmentFailedNumber.last_ins_paid_date
      ? moment(getInstallmentFailedNumber.last_ins_paid_date)
      : moment(getInstallmentFailedNumber.ins_start_date);
    // let todate = moment("09-09-2033");
    let todate = moment();
    let dueMonth = moment(todate).diff(lastInsPaidDate, "M");
    let matuityDate = moment(getInstallmentFailedNumber.maturity_date, "DD/MM/YYYY");
    let lastDayForPayment = moment(getInstallmentFailedNumber.maturity_date).add(
      Number(getInstallmentFailedNumber.maturity_max_day),
      "d"
    );
    let lastFormatedDayForPayment = moment(lastDayForPayment, "DD/MM/YYYY");

    let allowForRepayment = moment(todate).isBetween(matuityDate, lastFormatedDayForPayment);

    if (!allowForRepayment && dueMonth > Number(getInstallmentFailedNumber.ins_failed_number)) {
      throw new BadRequestError(
        `ইতিমধ্যে আপনার সর্বোচ্চ (${numberToWord(
          getInstallmentFailedNumber.ins_failed_number
        )}) সংখ্যক কিস্তি বকেয়া আছে`
      );
    }
    let total = parseInt(getCurrentBal.current_balance) + parseInt(data.tranAmt);
    let maxTranAmount = parseInt(dpsInfo.total_ins) * parseInt(dpsInfo.deposit_amt);
    const payable = maxTranAmount - parseInt(getCurrentBal.current_balance);
    if (total > maxTranAmount) {
      throw new BadRequestError(`সৰ্বোচ্চ প্রদান যোগ্য টাকার পরিমান ${payable}`);
    }
    const accountHolderNameSql = `SELECT a.name_bn FROM samity.customer_info a INNER JOIN loan.account_info b ON  a.id =b.customer_id WHERE b.id=$1`;
    const accountHolderName = (await client.query(accountHolderNameSql, [data.accountId])).rows[0]?.name_bn;
    let advancePaymentCheckValue, paidInsNumber;
    const chargeTypeGlSql = `SELECT a.charge_gl                                 
                                FROM   loan.product_charge_mst a
                                    INNER JOIN loan.product_charge_type b
                                            ON a.charge_type_id = b.id
                                              AND product_id = $1
                                              AND b.charge_type = 'LTF' `;
    const chargeTypeGl = (await client.query(chargeTypeGlSql, [data.productId])).rows[0]?.charge_gl;
    if (dpsPayableAmounts[dpsPayableAmounts.length - 1] < Number(data.tranAmt)) {
      if (dpsPayableAmounts.includes(0)) {
        paidInsNumber = Number(data.tranAmt) / Number(dpsPayableAmounts[dpsPayableAmounts.length - 1]);
      } else {
        advancePaymentCheckValue = Number(data.tranAmt) - dpsPayableAmounts[dpsPayableAmounts.length - 1];
        paidInsNumber = dpsPayableAmounts.length + Math.floor(advancePaymentCheckValue / Number(dpsInfo.deposit_amt));
      }
    } else {
      if (dpsPayableAmounts.includes(0)) {
        paidInsNumber = dpsPayableAmounts.indexOf(Number(data.tranAmt));
      } else {
        paidInsNumber = dpsPayableAmounts.indexOf(Number(data.tranAmt)) + 1;
      }
    }
    if (
      dpsPayableAmounts.includes(Number(data.tranAmt)) ||
      (dpsPayableAmounts.includes(0) &&
        Number(data.tranAmt) % Number(dpsPayableAmounts[dpsPayableAmounts.length - 1]) === 0) ||
      (advancePaymentCheckValue && advancePaymentCheckValue % Number(dpsInfo.deposit_amt) === 0)
    ) {
      const productSql = `SELECT product_gl FROM loan.product_mst WHERE id = $1`;
      const productInfo = (await client.query(productSql, [data.productId])).rows[0];
      const cashInHandGlSql = `SELECT 
                                id 
                              FROM 
                                loan.glac_mst 
                              WHERE 
                                doptor_id = $1
                                AND is_cash_in_hand = true 
                                AND parent_child = 'C'`;
      const cashInHandGl = (await client.query(cashInHandGlSql, [doptorId])).rows;
      if (!cashInHandGl) throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া যায়নি`);
      if (cashInHandGl.length > 1)
        throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া গেছে`);
      const tranNum = await this.generateTransactionNumber(client);
      const lateFineAmount = Number(data.tranAmt) % Number(dpsInfo.deposit_amt);

      const transactionSets = [
        {
          productId: data.productId,
          accountId: data.accountId,
          naration: "Dps Installment Collection",
          drcrCode: "C",
          glacId: productInfo.product_gl,
          tranAmt: Number(data.tranAmt) - lateFineAmount,
          batchNum,
          tranNum,
          tranCode: "DPS",
          tranType: "CASH",
        },
        {
          productId: data.productId,
          naration: "Deposit to member DPS account",
          drcrCode: "D",
          glacId: cashInHandGl[0].id,
          tranAmt: data.tranAmt,
          batchNum,
          tranNum,
          tranCode: "DPS",
          tranType: "CASH",
        },
      ];
      if (lateFineAmount && lateFineAmount > 0) {
        transactionSets.push({
          productId: data.productId,
          accountId: data.accountId,
          naration: "Dps Installment Collection",
          drcrCode: "C",
          glacId: chargeTypeGl,
          tranAmt: Number(lateFineAmount),
          batchNum,
          tranNum,
          tranCode: "DPS",
          tranType: "CASH",
        });
      }
      const result = await this.generalTransactionEngine(
        doptorId,
        officeId,
        projectId,
        createdBy,
        productInfo.deposit_nature,
        transactionSets,
        client
      );
      let predictedNextInsEndDate = moment(dpsInfo.next_ins_end_date).add(paidInsNumber, "M");

      const nextInsEndDate = await this.nextWorkingDay(predictedNextInsEndDate, doptorId, officeId, "M");
      const { sql: timeDepositSql, params: timeDepositParams } = buildUpdateWithWhereSql(
        "loan.time_deposit_mst",
        { accountId: data.accountId },
        {
          nextInsStartDate: moment(dpsInfo.next_ins_start_date).add(paidInsNumber, "M").format("DD/MM/YYYY"),
          nextInsEndDate: nextInsEndDate.format("DD/MM/YYYY"),
          paidIns: Number(dpsInfo.paid_ins) + Number(paidInsNumber),
          lastInsPaidDate: new Date(),
          updatedBy: createdBy,
          updatedAt: new Date(),
        }
      );

      const timeDepositRes = (await client.query(timeDepositSql, timeDepositParams)).rows[0];

      return result;
    } else {
      throw new BadRequestError(accountHolderName + "," + "আপনার জমার পরিমাণ টি সঠিক নয়");
    }
  }
  ////////////  Transection set update and account close when a dps well be closed ////////
  async makeDpsClose(
    applicationData: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    createdBy: number,
    client: PoolClient
  ) {
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
    const chargeTypeGlSql = `SELECT a.charge_gl ,a.charge_value                                
                                FROM   loan.product_charge_mst a
                                    INNER JOIN loan.product_charge_type b
                                            ON a.charge_type_id = b.id
                                              AND product_id = $1
                                              AND b.charge_type = 'CLC' `;
    const chargeTypeGl = (await client.query(chargeTypeGlSql, [applicationData.productId])).rows;

    const taxGlSql = `SELECT a.charge_gl ,a.charge_value                                
    FROM   loan.product_charge_mst a
        INNER JOIN loan.product_charge_type b
                ON a.charge_type_id = b.id
                  AND product_id = $1
                  AND b.charge_type = 'TAX' `;
    const taxGl = (await client.query(taxGlSql, [applicationData.productId])).rows;
    const batchNum = await this.generateBatchNumber(client);
    const tranNum = await this.generateTransactionNumber(client);
    let currentBalance = accountBalance?.current_balance ? Number(accountBalance.current_balance) : 0;
    const interestAmount = applicationData?.interestAmounts ? Number(applicationData.interestAmounts) : 0;
    let transactionSets = [];
    if (Number(applicationData.interestAmounts)) {
      transactionSets.push(
        {
          productId: applicationData.productId,
          accountId: applicationData.accountId,
          naration: "Dps Close profit credit transaction",
          drcrCode: "C",
          glacId: productInfo.product_gl,
          tranAmt: Number(applicationData.interestAmounts),
          batchNum,
          tranNum,
          tranCode: "CLS",
          tranType: "CASH",
        },
        {
          productId: applicationData.productId,
          naration: "Dps Close profit debit transaction",
          drcrCode: "D",
          glacId: productInfo.provision_debit_gl,
          tranAmt: Number(applicationData.interestAmounts),
          batchNum,
          tranNum,
          tranCode: "CLS",
          tranType: "CASH",
        }
      );
    }

    if (taxGl.length > 0) {
      transactionSets.push(
        {
          productId: applicationData.productId,
          accountId: applicationData.customerAcc,
          naration: "Dps Close Tax cradit transaction",
          drcrCode: "C",
          glacId: taxGl[0].charge_gl,
          tranAmt: taxGl[0].charge_value,
          batchNum,
          tranNum,
          tranCode: "TAX",
          tranType: "CASH",
        },
        {
          productId: applicationData.productId,
          naration: "Dps Close Tax Debit transaction",
          drcrCode: "D",
          glacId: productInfo.product_gl,
          tranAmt: Number(taxGl[0].charge_value),
          batchNum,
          tranNum,
          tranCode: "TAX",
          tranType: "CASH",
        }
      );
      currentBalance = currentBalance - Number(taxGl[0].charge_value);
    }
    if (chargeTypeGl.length > 0) {
      transactionSets.push(
        {
          productId: applicationData.productId,
          accountId: applicationData.customerAcc,
          naration: "Dps Close charge cradit transaction",
          drcrCode: "C",
          glacId: chargeTypeGl[0].charge_gl,
          tranAmt: chargeTypeGl[0].charge_value,
          batchNum,
          tranNum,
          tranCode: "CLC",
          tranType: "CASH",
        },
        {
          productId: applicationData.productId,
          naration: "Dps Close Tax Debit transaction",
          drcrCode: "D",
          glacId: productInfo.product_gl,
          tranAmt: Number(chargeTypeGl[0].charge_value),
          batchNum,
          tranNum,
          tranCode: "CLC",
          tranType: "CASH",
        }
      );
      currentBalance = currentBalance - Number(chargeTypeGl[0].charge_value);
    }
    transactionSets = [
      ...transactionSets,
      {
        productId: applicationData.productId,
        accountId: applicationData.customerAcc,
        naration: "Dps Close cradit transaction",
        drcrCode: "D",
        glacId: productInfo.product_gl,
        tranAmt: currentBalance + interestAmount,
        batchNum,
        tranNum,
        tranCode: "CLS",
        tranType: "CASH",
      },
      {
        productId: applicationData.productId,
        naration: "Dps Close Debit transaction",
        drcrCode: "C",
        glacId: cashInHandGl[0]?.id,
        tranAmt: currentBalance + interestAmount,
        batchNum,
        tranNum,
        tranCode: "CLS",
        tranType: "CASH",
      },
    ];

    const result = await this.generalTransactionEngine(
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
      { id: applicationData.customerAcc },
      {
        accountStatus: "CLS",
        closeBy: createdBy,
        closeDate: new Date(),
        updatedBy: createdBy,
        updatedAt: new Date(),
      }
    );

    const accInfoRes = (await client.query(accountInfoSql, accountInfoParams)).rows[0];

    return accInfoRes;
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
