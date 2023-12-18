import Container, { Service } from "typedi";
import { Pool, PoolClient } from "pg";
import moment from "moment-timezone";
import { BadRequestError, buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { IMakeRepaymentSequence, ITransactionAttrs } from "../interfaces/transaction.interface";
import lodash from "lodash";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";
import { DayOpenCloseService } from "./day-open-close.service";
import TransactionService from "./transaction.service";


@Service()
export class RepaymentTranService {
  constructor() {}

  //customer loan account balance, status check
  async customerLoanAccountChecking(accountId: number, isAdvanceBenifit: boolean, transaction: PoolClient | Pool) {
    const getPrincipalServiceChargeSql = `SELECT 
                                              sanction_limit, 
                                              profit_amount 
                                            FROM 
                                              loan.global_limit 
                                            WHERE 
                                              account_id = $1`;

    const principalServiceCharge = (await transaction.query(getPrincipalServiceChargeSql, [accountId])).rows[0];

    if (!principalServiceCharge) throw new BadRequestError(`প্রদত্ত অ্যাকাউন্টের কোন ঋণের তথ্য পাওয়া যায়নি`);

    const accountPaidInfoSql = `SELECT 
                                    FLOOR(
                                      SUM(principal_paid_amount)
                                    ) principal_paid_amount, 
                                    FLOOR(
                                      SUM(interest_paid_amount)
                                    ) interest_paid_amount, 
                                    FLOOR(
                                      SUM(total_paid_amount)
                                    ) total_paid_amount 
                                  FROM 
                                    loan.schedule_info 
                                  WHERE 
                                    account_id = $1`;
    const accountPaidInfo = (await transaction.query(accountPaidInfoSql, [accountId])).rows[0];

    if (!accountPaidInfo) throw new BadRequestError(`প্রদত্ত অ্যাকাউন্টের কোন শিডিউলের তথ্য পাওয়া যায়নি`);

    let totalAmount = 0;
    let balancedInterest = 0;
    if (isAdvanceBenifit) {
      const getServiceChargeWithBenifitSql = `SELECT 
                                                COALESCE(
                                                  SUM(interest_amount), 
                                                  0
                                                ) interest_paid_amount 
                                              FROM 
                                                loan.schedule_info 
                                              WHERE 
                                                due_date <= CURRENT_DATE
                                                AND account_id = $1`;
      const getServiceChargeWithBenifit = (await transaction.query(getServiceChargeWithBenifitSql, [accountId]))
        .rows[0];
      if (!getServiceChargeWithBenifit)
        throw new BadRequestError(`অগ্রিম কিস্তি প্রদানের সুবিধার ক্ষেত্রে সর্বমোট সার্ভিস চার্জের পরিমান পাওয়া যায়নি`);

      let interestPaidAmount = getServiceChargeWithBenifit?.interestAmount
        ? Number(getServiceChargeWithBenifit.interestAmount)
        : 0;
      totalAmount = Number(principalServiceCharge.sanction_limit) + interestPaidAmount;
      balancedInterest = interestPaidAmount - Number(accountPaidInfo.interest_paid_amount);
    } else {
      totalAmount = Number(principalServiceCharge.sanction_limit) + Number(principalServiceCharge.profit_amount);
      balancedInterest = Number(principalServiceCharge.profit_amount) - Number(accountPaidInfo.interest_paid_amount);
    }
    const balancedPrincipal =
      Number(principalServiceCharge.sanction_limit) - Number(accountPaidInfo.principal_paid_amount);

    const balancedTotal = Number(totalAmount) - Number(accountPaidInfo.total_paid_amount);

    return { balancedPrincipal, balancedInterest, balancedTotal };
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

  //to make repayment sequence order
  async makeRepaymentSequence(
    type: string,
    transactionAmt: number,
    scheduleData: any
  ): Promise<IMakeRepaymentSequence | undefined> {
    switch (type) {
      case "realization_seq_principal":
        let { principalPaidAmount, pTranAmt } = await this.makePrincipalBalance(transactionAmt, scheduleData);

        return {
          finalPaidAmount: principalPaidAmount,
          updateTranAmt: pTranAmt,
        };
      case "realization_seq_service":
        let { interestPaidAmount, sTranAmt } = await this.makeServiceChargeBalance(transactionAmt, scheduleData);
        return {
          finalPaidAmount: interestPaidAmount,
          updateTranAmt: sTranAmt,
        };
    }
  }

  //check schedule payment status
  async isPaymentComplete(
    isAdvanceBenifit: boolean,
    principalAmount: number,
    serviceChargeAmount: number,
    benifitServiceChargeAmount: number,
    totalAmount: number
  ) {
    //   isAdvanceBenifit,
    //   principalAmount,
    //   serviceChargeAmount,
    //   totalAmount,
    // });

    let paymentCompleteStatus = false;
    if (isAdvanceBenifit) {
      let withBenifitTotal = totalAmount - benifitServiceChargeAmount;
      if (withBenifitTotal == principalAmount) paymentCompleteStatus = true;
    } else {
      let totalPaid = principalAmount + serviceChargeAmount;
      if (totalAmount == totalPaid) paymentCompleteStatus = true;
    }

    return paymentCompleteStatus;
  }

  //repayment transaction
  async createRepayment(
    data: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    batchNum: string,
    tranType: string,
    paymentConfig: { gl: ITransactionAttrs[]; account: ITransactionAttrs[] },
    createdBy: number,
    client: PoolClient
  ) {
    if (doptorId == 10) {
      // for milk-vita due amount fix and always payble the full amount.
      const getDueAmountSql = `SELECT 
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
      const dueAmount = (await client.query(getDueAmountSql, [data.accountId])).rows[0]?.total_amount;

      if (Number(dueAmount) && data.tranAmt != dueAmount && data.tranAmt < dueAmount) {
        throw new BadRequestError("সদস্যের পরিশোধিত টাকা ঋণের বকেয়ার চেয়ে ছোট হতে পারবে না");
      }
    }
    let incDataInServiceChargeInfo = {};
    let indDataInServiceChargeInfo = {};
    let transactionSets = [] as any;
    const productInfoSql = `SELECT 
                              product_gl,
                              principal_gl,
                              service_charge_gl, 
                              is_adv_pay_benefit,
                              deposit_nature
                            FROM 
                              loan.product_mst 
                            WHERE 
                              id = $1`;
    const productInfo = (await client.query(productInfoSql, [data.productId])).rows[0];
    const accSql = `SELECT customer_id, account_status FROM loan.account_info WHERE id = $1`;
    const accInfo = (await client.query(accSql, [data.accountId])).rows[0];

    if (!accInfo.account_status && accInfo.account_status != "ACT")
      throw new BadRequestError(`কাস্টমারের ঋণের একাউন্ট সচল নয়`);
    else {
      const scheduleSql = `
              SELECT 
                id, 
                installment_no, 
                due_date, 
                (principal_amount - COALESCE (principal_paid_amount, 0)) principal_due, 
                (interest_amount - COALESCE (interest_paid_amount, 0)) charge_due, 
                (total_amount - COALESCE (total_paid_amount, 0)) total_due,
                interest_amount,
                total_amount,
                is_payment_complete,
                transaction_details
              FROM 
                loan.schedule_info 
              WHERE 
                account_id = $1 
                AND (total_amount - COALESCE (total_paid_amount, 0)) > 0
                AND is_payment_complete = false
              ORDER BY 
                installment_no ASC`;
      const scheduleInfo = (await client.query(scheduleSql, [data.accountId])).rows;

      if (scheduleInfo.length <= 0) throw new BadRequestError(`সদস্যের ঋণের কোন শিডিউল পাওয়া যায়নি`);

      const {
        balancedPrincipal: currentPrincipal,
        balancedInterest: currentInterest,
        balancedTotal: currentTotal,
      } = await this.customerLoanAccountChecking(data.accountId, productInfo.is_adv_pay_benefit, client);

      if (currentTotal < data.tranAmt) {
        let err = `সদস্যের সর্বোচ্চ পরিশোধযোগ্য টাকার পরিমাণ ${numberToWord(currentTotal)} টাকা`;
        throw new BadRequestError(err);
      }
      const disburseSql = `SELECT 
                            sanction_limit, 
                            service_charge_rate, 
                            profit_amount, 
                            loan_term, 
                            disbursed_date 
                          FROM 
                            loan.global_limit 
                          WHERE 
                            account_id = $1`;
      const disburseInfo = (await client.query(disburseSql, [data.accountId])).rows[0];

      if (!productInfo.principal_gl) throw new BadRequestError(`প্রদত্ত প্রোডাক্টে মূলধনের জিএল পাওয়া যায়নি`);
      else if (!productInfo.service_charge_gl)
        throw new BadRequestError(`প্রদত্ত প্রোডাক্টে সার্ভিস চার্জের জিএল পাওয়া যায়নি`);
      const nextTranIdSql = `SELECT nextval('loan.transaction_daily_id_seq') tran_id`;
      const repayDate = new Date();

      const paySerialSql = `SELECT realization_seq_principal, realization_seq_service 
                              FROM loan.product_mst WHERE id = $1`;
      const paySerialInfo = (await client.query(paySerialSql, [data.productId])).rows[0];

      if (!paySerialInfo.realization_seq_principal || !paySerialInfo.realization_seq_service)
        throw new BadRequestError(`কিস্তি আদায়ের ক্রমানুসার পাওয়া যায়নি`);

      let allSerial = Object.entries(paySerialInfo).sort((a: any, b: any) => a[1] - b[1]);
      allSerial = allSerial.map((value: any) => value[0]);

      const paidSql = `SELECT 
                        id, 
                        principal_paid_amount, 
                        interest_paid_amount, 
                        total_paid_amount 
                      FROM 
                        loan.schedule_info 
                      WHERE 
                        id = $1`;
      const accBalanceSql = `SELECT 
                              current_balance 
                            FROM 
                              loan.account_balance 
                            WHERE 
                              account_id = $1`;
      let accBalance = (await client.query(accBalanceSql, [data.accountId])).rows[0].current_balance;
      let principalPaidAmount = 0;
      let interestPaidAmount = 0;
      let finalPaidPrincipal = 0;
      let finalPaidInterest = 0;
      //let scheduleUpdateData: any = [];
      let tranAmt: number = Number(data.tranAmt);
      let interestRebateAmount = null;
      let transactionDetails = [] as any;
      let prinTranHistory = [] as any;
      let interestTranHistory = [] as any;
      let allPrinTranHistory;
      let allInterestTranHistory;
      let allPrincipalScheduleId = [];
      let allInterestScheduleId = [];
      let finalTotalAmount = data.tranAmt;

      //transaction open date
      const dayOpenCloseService: DayOpenCloseService = Container.get(DayOpenCloseService);
      const transactionDate = await dayOpenCloseService.getOpenDate(undefined, doptorId, officeId, projectId, client);

      if (!transactionDate || !transactionDate.openCloseDate) {
        throw new BadRequestError(`লেনদেন সংঘটিত হওয়ার তারিখ পাওয়া যায়নি`);
      }
      //traverse schedule info and paid amount calculation
      for (const [index, scheduleData] of scheduleInfo.entries()) {
        if (scheduleData.due_date > repayDate && productInfo.is_adv_pay_benefit) {
          const removalIndexValue = allSerial.indexOf("realization_seq_service" as any);
          // for advance benefit purpose index remove from arr
          if (removalIndexValue != -1) {
            allSerial.splice(removalIndexValue, 1);
          }
        }

        //principal, service charge, penal charge sequential traverse
        for (const serial of allSerial) {
          transactionDetails = [];
          let param = serial.toString();

          let { finalPaidAmount, updateTranAmt } = (await this.makeRepaymentSequence(
            param,
            tranAmt,
            scheduleData
          )) as any;
          tranAmt = updateTranAmt;

          //make principal balance
          if (param === "realization_seq_principal") {
            principalPaidAmount += Number(finalPaidAmount);
            const principalPaidInfo = (await client.query(paidSql, [scheduleData.id])).rows[0];

            let prePrincipalPaidAmount = principalPaidInfo.principal_paid_amount
              ? Number(principalPaidInfo.principal_paid_amount)
              : 0;
            //set schedule update data
            finalPaidPrincipal = Number(prePrincipalPaidAmount + Math.round(Number(finalPaidAmount)));

            finalPaidInterest = Number(
              principalPaidInfo.interest_paid_amount ? Number(principalPaidInfo.interest_paid_amount) : 0
            );

            if (finalPaidAmount != 0) {
              allPrincipalScheduleId.push({
                id: scheduleData.id,
                tranAmt: finalPaidAmount,
              });
            }
            let isPaymentComplete = await this.isPaymentComplete(
              productInfo.is_adv_pay_benefit,
              finalPaidPrincipal,
              finalPaidInterest,
              scheduleData.interest_amount,
              scheduleData.total_amount
            );
            if (scheduleData.due_date > repayDate && productInfo.is_adv_pay_benefit && isPaymentComplete) {
              interestRebateAmount = scheduleData.charge_due;
            }

            //update schedule info for principal amount
            const { sql: prinScheSql, params: prinScheParams } = buildUpdateWithWhereSql(
              "loan.schedule_info",
              { id: scheduleData.id },
              {
                principalPaidAmount: Math.round(finalPaidPrincipal),
                totalPaidAmount: finalPaidPrincipal + finalPaidInterest,
                isPaymentComplete,
                interestRebateAmount: interestRebateAmount ? interestRebateAmount : 0,
                paidDate: new Date(),
                paidBy: createdBy,
                updatedBy: createdBy,
                updatedAt: new Date(),
              }
            );
            const prinScheInfo = await client.query(prinScheSql, prinScheParams);

            if (tranAmt <= 0) break;
          }

          //make service charge balance
          else if (param === "realization_seq_service") {
            interestPaidAmount += Number(finalPaidAmount);
            const interestPaidInfo = (await client.query(paidSql, [scheduleData.id])).rows[0];
            const preInterestPaidAmount = Number(
              interestPaidInfo.interest_paid_amount ? Number(interestPaidInfo.interest_paid_amount) : 0
            );

            //set schedule updated data
            finalPaidInterest = preInterestPaidAmount + Math.round(Number(finalPaidAmount));
            finalPaidPrincipal = Number(
              interestPaidInfo.principal_paid_amount ? Number(interestPaidInfo.principal_paid_amount) : 0
            );

            if (finalPaidAmount != 0) {
              allInterestScheduleId.push({
                id: scheduleData.id,
                tranAmt: finalPaidAmount,
              });
            }

            //update schedule info for service charge amount
            const { sql: serScheSql, params: serScheParams } = buildUpdateWithWhereSql(
              "loan.schedule_info",
              { id: scheduleData.id },
              {
                interestPaidAmount: Math.round(finalPaidInterest),
                totalPaidAmount: finalPaidPrincipal + finalPaidInterest,
                isPaymentComplete: await this.isPaymentComplete(
                  productInfo.is_adv_pay_benefit,
                  finalPaidPrincipal,
                  finalPaidInterest,
                  scheduleData.interest_amount,
                  scheduleData.total_amount
                ),
                interestRebateAmount: interestRebateAmount ? interestRebateAmount : 0,
                paidDate: new Date(),
                paidBy: createdBy,
                updatedBy: createdBy,
                updatedAt: new Date(),
              }
            );

            const serScheInfo = await client.query(serScheSql, serScheParams);
          }
        }

        if (tranAmt <= 0) break;
      }
      const transactionServices:TransactionService = Container.get(TransactionService);

      let tranNum = data?.tranNum ? data.tranNum : await transactionServices.generateTransactionNumber(client);
      //repayment principal transaction
      if (principalPaidAmount > 0) {
        transactionDetails = [];
        let repNextTranId = (await client.query(nextTranIdSql)).rows[0].tran_id;

        //repayment transaction
        transactionSets.push({
          id: repNextTranId,
          ...lodash.omit(data, ["tranAmt", "productType"]),
          naration: "Principal amount transaction of repayment",
          batchNum,
          tranNum,
          tranDate: transactionDate.openCloseDate,
          tranCode: "REP",
          drcrCode: "C",
          tranAmt: principalPaidAmount,
          glacId: productInfo.principal_gl,
          projectId,
          tranType,
        });

        let allTranSerials;
        const scheduleHistorySql = `SELECT 
                                      transaction_details 
                                    FROM 
                                      loan.schedule_info 
                                    WHERE 
                                      id = $1`;
        for (let singleScheduleId of allPrincipalScheduleId) {
          transactionDetails = [];
          let tranDetails = (await client.query(scheduleHistorySql, [singleScheduleId.id])).rows[0]
            ?.transaction_details;

          if (tranDetails && tranDetails[0]) {
            allTranSerials = tranDetails.map((value: any) => value.serialNo);
            prinTranHistory = [...tranDetails];
          } else {
            allTranSerials = [0];
            prinTranHistory = [];
          }

          let maxSerial = Math.max(...allTranSerials);

          transactionDetails = [
            {
              serialNo: ++maxSerial,
              tranNum,
              tranAmt: singleScheduleId.tranAmt,
              tranCode: "REP",
              paidDate: moment(transactionDate.openCloseDate).format("DD/MM/YYYY"),
            },
          ];

          allPrinTranHistory = [...prinTranHistory, ...transactionDetails];

          let { sql: updateTranHistorySql, params: updateTranHistoryParams } = buildUpdateWithWhereSql(
            "loan.schedule_info",
            { id: singleScheduleId.id },
            {
              transactionDetails: JSON.stringify(allPrinTranHistory),
            }
          );

          let tranHistoryRes = (await client.query(updateTranHistorySql, updateTranHistoryParams)).rows[0];
        }
        principalPaidAmount = 0;
      }

      //repayment charge transaction
      if (interestPaidAmount > 0) {
        transactionDetails = [];
        let incNextTranId = (await client.query(nextTranIdSql)).rows[0].tran_id;

        //INC save in service charge info table
        incDataInServiceChargeInfo = {
          doptorId,
          officeId,
          projectId,
          productId: data.productId,
          accountId: data.accountId,
          tranCode: "INC",
          drcrCode: "C",
          refDocNo: tranNum,
          amount: interestPaidAmount,
          refTranId: incNextTranId,
          createdBy,
          createdAt: new Date(),
        };

        //IND save in service charge info table
        let indNextTranId = (await client.query(nextTranIdSql)).rows[0].tran_id;
        indDataInServiceChargeInfo = {
          doptorId,
          officeId,
          projectId,
          productId: data.productId,
          accountId: data.accountId,
          tranCode: "IND",
          drcrCode: "D",
          refDocNo: tranNum,
          amount: interestPaidAmount,
          refTranId: indNextTranId,
          createdBy,
          createdAt: new Date(),
        };

        //INC transaction save in transaction daily table
        transactionSets.push({
          id: incNextTranId,
          ...lodash.omit(data, ["tranAmt", "productType"]),
          naration: "Service charge transaction of repayment",
          batchNum,
          tranNum: tranNum,
          tranDate: transactionDate.openCloseDate,
          tranCode: "INC",
          drcrCode: "C",
          tranAmt: interestPaidAmount,
          glacId: productInfo.product_gl,
          projectId,
          tranType,
        });

        //IND save in transaction daily table
        transactionSets.push({
          id: indNextTranId,
          ...lodash.omit(data, ["tranAmt", "productType"]),
          naration: "IND charge transaction of repayment",
          batchNum,
          tranNum: tranNum,
          tranDate: transactionDate.openCloseDate,
          tranCode: "IND",
          drcrCode: "D",
          tranAmt: interestPaidAmount,
          glacId: productInfo.service_charge_gl,
          projectId,
          tranType,
        });

        let allTranSerials;
        const scheduleHistorySql = `SELECT 
                                      transaction_details 
                                    FROM 
                                      loan.schedule_info 
                                    WHERE 
                                      id = $1`;
        for (let singleScheduleId of allInterestScheduleId) {
          transactionDetails = [];
          let tranDetails = (await client.query(scheduleHistorySql, [singleScheduleId.id])).rows[0]
            ?.transaction_details;
          if (tranDetails && tranDetails[0]) {
            allTranSerials = tranDetails.map((value: any) => value.serialNo);
            interestTranHistory = [...tranDetails];
          } else {
            allTranSerials = [0];
            interestTranHistory = [];
          }

          let maxSerialNo = Math.max(...allTranSerials);

          transactionDetails = [
            {
              serialNo: ++maxSerialNo,
              tranNum,
              tranAmt: singleScheduleId.tranAmt,
              tranCode: "INC",
              paidDate: moment(transactionDate.openCloseDate).format("DD/MM/YYYY"),
            },
          ];

          allInterestTranHistory = [...interestTranHistory, ...transactionDetails];

          let { sql: updateTranHistorySql, params: updateTranHistoryParams } = buildUpdateWithWhereSql(
            "loan.schedule_info",
            { id: singleScheduleId.id },
            {
              transactionDetails: JSON.stringify(allInterestTranHistory),
            }
          );

          let tranHistoryRes = (await client.query(updateTranHistorySql, updateTranHistoryParams)).rows[0];
        }
        interestPaidAmount = 0;
      }

      if (paymentConfig.gl && paymentConfig.gl.length > 0) {
        //gl transaction
        paymentConfig.gl.forEach((element) => {
          transactionSets.push({
            ...element,
            batchNum,
            tranNum,
            tranCode: "REP",
            tranType: "TRANSFER",
          });
        });
      } else if (paymentConfig.account && paymentConfig.account.length > 0) {
        //account to account transaction
        paymentConfig.account.forEach((element) => {
          transactionSets.push({
            ...element,
            batchNum,
            tranNum,
            tranType: "TRANSFER",
          });
        });
      } else {
        //repayment cash in hand transaction
        const cashInHandGlSql = `SELECT 
                                  id 
                                  FROM 
                                  loan.glac_mst 
                                  WHERE 
                                  doptor_id = $1
                                  AND is_cash_in_hand = true 
                                  AND parent_child = 'C'`;
        const cashInHandGl = (await client.query(cashInHandGlSql, [doptorId])).rows;
        if (!cashInHandGl)
          throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া যায়নি`);
        if (cashInHandGl.length > 1)
          throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া গেছে`);

        transactionSets.push({
          ...lodash.omit(data, ["tranAmt", "productType", "accountId"]),
          batchNum,
          tranNum: tranNum,
          tranDate: transactionDate.openCloseDate,
          tranCode: "REP",
          drcrCode: "D",
          naration: "Cash in hand transaction for repayment",
          tranAmt: Number(finalTotalAmount),
          glacId: cashInHandGl[0].id,
          projectId,
          tranType,
        });
      }
      transactionDetails = [];
    }
    const transactionServices:TransactionService = Container.get(TransactionService);
    let transactionInfo = (await transactionServices.generalTransactionEngine(
      doptorId,
      officeId,
      projectId,
      createdBy,
      productInfo.deposit_nature,
      transactionSets,
      client
    )) as any;

    if (Object.values(incDataInServiceChargeInfo).length > 0 && Object.values(indDataInServiceChargeInfo).length > 0) {
      let incTranInfo = transactionInfo.filter((value: any) => value.tranCode == "INC");
      let indTranInfo = transactionInfo.filter((value: any) => value.tranCode == "IND");
      let incTranDate = incTranInfo && incTranInfo[0] && incTranInfo[0]?.tranDate;
      let indTranDate = indTranInfo && indTranInfo[0] && indTranInfo[0]?.tranDate;

      const { sql: incSerCrgSql, params: incSerCrgParams } = buildInsertSql("loan.service_charge_info", {
        ...incDataInServiceChargeInfo,
        tranDate: incTranDate,
        valDate: new Date(),
      });

      const incSerCrgInfo = (await client.query(incSerCrgSql, incSerCrgParams)).rows[0];

      const { sql: indSerCrgSql, params: indSerCrgParams } = buildInsertSql("loan.service_charge_info", {
        ...indDataInServiceChargeInfo,
        tranDate: indTranDate,
        valDate: new Date(),
      });

      const indSerCrgInfo = (await client.query(indSerCrgSql, indSerCrgParams)).rows[0];
    }
    const {
      balancedPrincipal: finaPrincipal,
      balancedInterest: finalInterest,
      balancedTotal: finalTotal,
    } = await this.customerLoanAccountChecking(data.accountId, productInfo.is_adv_pay_benefit, client);

    //customer account status update after complete all schedules
    if (finalTotal == 0) {
      const { sql: updateAccountSql, params: updateAccountParams } = buildUpdateWithWhereSql(
        "loan.account_info",
        { id: data.accountId },
        {
          accountStatus: "CLS",
          closeBy: createdBy,
          closeDate: new Date(),
          updatedBy: createdBy,
          updatedAt: new Date(),
        }
      );
      client.query(updateAccountSql, updateAccountParams);
    }

    return "কিস্তি সফলভাবে পরিশোধ হয়েছে";
  }
}
