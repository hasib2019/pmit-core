import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildInsertSql, buildSql } from "rdcd-common";
import lodash, { floor } from "lodash";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import moment from "moment";
import { toDate } from "date-fns";
// import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";

@Service()
export default class DpsService {
  constructor() {}
  async getInstallmentAmounts(productId: number) {
    const toDate = moment(new Date());
    const pool = db.getConnection("slave");
    const getInstallmentAmountsSql = `SELECT ins_amt,is_active,effect_date FROM loan.product_interest WHERE product_id =$1 AND is_active=true`;
    const installmentAmount = (await pool.query(getInstallmentAmountsSql, [productId])).rows;
    //// filter active Interest options
    const activeInstallmentOptions = installmentAmount.filter((value) => moment(value.effect_date).isBefore(toDate));
    // console.log({ activeInstallmentOptions });
    return activeInstallmentOptions[0] ? toCamelKeys(activeInstallmentOptions) : [];
  }

  async getTime(productId: number, installmentAmount: number, id?: number) {
    const pool = db.getConnection("slave");
    let sql, productInterestDetails;
    if (id) {
      sql = `SELECT int_rate , maturity_amount FROM loan.product_interest WHERE id =$1`;
      productInterestDetails = (await pool.query(sql, [id])).rows;
    } else {
      sql = `SELECT id, time_period  FROM loan.product_interest WHERE product_id = $1 AND ins_amt = $2 ORDER BY time_period ASC`;
      productInterestDetails = (await pool.query(sql, [productId, installmentAmount])).rows;
    }
    return productInterestDetails[0] ? toCamelKeys(productInterestDetails) : [];
  }

  async getRepaymentAmount(accountId: number, productId: number, doptorId: number, officeId: number) {
    const pool = db.getConnection("slave");
    let sql = `SELECT 
                    a.deposit_amt, 
                    a.total_ins, 
                    a.paid_ins, 
                    a.next_ins_start_date, 
                    a.next_ins_end_date, 
                    a.last_ins_paid_date, 
                    a.time_frq, 
                    c.ins_end_day, 
                    c.fine_allow, 
                    c.product_gl, 
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
                    AND a.product_id = $2
                    AND a.doptor_id = $3 
                    AND a.office_id = $4`;
    let dpsInfo = (await pool.query(sql, [accountId, productId, doptorId, officeId])).rows[0];
    if (!dpsInfo) throw new BadRequestError("ডিপিএস এর কোনো তথ্য পাওয়া যাই নি");
    let chargeInfoSql = `SELECT 
                          a.charge_value, 
                          a.charge_nature, 
                          a.charge_gl 
                        FROM 
                          loan.product_charge_mst a 
                          LEFT JOIN loan.product_charge_type b ON a.charge_type_id = b.id 
                        WHERE 
                          a.product_id = $1 
                          AND b.charge_type = 'LTF'`;
    let chargeInfo = (await pool.query(chargeInfoSql, [productId])).rows[0];
    let repayDate = moment(new Date(), "DD/MM/YYYY");
    let nextInsDate = moment(dpsInfo?.next_ins_end_date, "DD/MM/YYYY");
    let payableAmount: number[] = [];
    if (moment(repayDate).isAfter(nextInsDate)) {
      let dueDate;
      const startDate = moment(dpsInfo.next_ins_end_date, "DD/MM/YYYY");
      const endDate = moment(repayDate, "DD/MM/YYYY");
      dueDate = moment(endDate).diff(startDate, "d");
      if (dpsInfo.time_frq == "M") {
        let depositAmount = Number(dpsInfo.deposit_amt);
        let dueCharge = Number(chargeInfo.charge_value);
        let payableAmountArray = [];
        let totalDueMonth = Math.ceil(Number(dueDate) / 31);
        console.log({ totalDueMonth });
        let repayDay = Number(repayDate.format("DD"));
        let lastDayForRepay = dpsInfo.ins_end_day;
        if (repayDay <= lastDayForRepay) {
          totalDueMonth = totalDueMonth - 1;
          let totalPayableAmount;
          for (let i = totalDueMonth; i > 0; i--) {
            if (chargeInfo.charge_nature == "P") {
              let charge = depositAmount * (dueCharge / 100);
              totalPayableAmount = depositAmount + i * charge;
            } else if (chargeInfo.charge_nature == "F") {
              totalPayableAmount = depositAmount + i * dueCharge;
            } else {
              throw new BadRequestError("এই প্রোডাক্টের সঠিক চার্জ পরিমাপের ধরণ  উল্লেখ করুন");
            }
            payableAmountArray.push(totalPayableAmount);
          }
          payableAmountArray.push(depositAmount);
        } else {
          let totalPayableAmount;
          for (let i = totalDueMonth; i > 0; i--) {
            if (chargeInfo.charge_nature == "P") {
              let charge = depositAmount * (dueCharge / 100);
              totalPayableAmount = depositAmount + i * charge;
            } else if (chargeInfo.charge_nature == "F") {
              totalPayableAmount = depositAmount + i * dueCharge;
            } else {
              throw new BadRequestError("এই প্রোডাক্টের সঠিক চার্জ পরিমাপের ধরণ  উল্লেখ করুন");
            }
            payableAmountArray.push(totalPayableAmount);
          }
        }
        let oldPayableAmountArray = payableAmountArray;
        payableAmount = [oldPayableAmountArray[0]];
        for (let i = 1; i < oldPayableAmountArray.length; i++) {
          payableAmount.push(oldPayableAmountArray[i] + payableAmount[i - 1]);
        }
      } else if (dpsInfo.time_frq == "W") {
        throw new BadRequestError("এই প্রোডাক্টের সাপ্তাহিক ডিপিএস আদায়ের পদ্ধতি নেই");
      }
    }
    ////////// due date er moddhe payment dite asle, payable amount hobe //////////
    else if (moment(repayDate).isBetween(moment(dpsInfo.next_ins_start_date), moment(dpsInfo.next_ins_end_date))) {
      payableAmount[0] = dpsInfo.deposit_amt;
    }
    //////////// after due date repayment //////////
    else {
      payableAmount = [0, dpsInfo.deposit_amt];
    }
    return payableAmount;
  }

  async getAccountDetails(accountId: number) {
    const pool = db.getConnection("slave");
    const accountDetailsSql = `SELECT 
                                  a.product_id,
                                  a.time_period, 
                                  a.total_ins, 
                                  a.paid_ins,  
                                  a.maturity_date, 
                                  a.maturity_amount,
                                  a.int_rate, 
                                  c.current_balance, 
                                  a.deposit_amt,
                                  a.eff_date
                                FROM 
                                  loan.time_deposit_mst a 
                                  INNER JOIN loan.account_info b ON a.account_id = b.id 
                                  INNER JOIN loan.account_balance c ON b.id = c.account_id 
                                  
                                WHERE 
                                  a.account_id = $1
                                  AND b.account_status = 'ACT'`;
    let singleDpsAccountDetails = (await pool.query(accountDetailsSql, [accountId]))?.rows[0];
    console.log({ singleDpsAccountDetails });

    const installmentIdSql = `select id from loan.product_interest where product_id = $1 and ins_amt = $2 and time_period = $3`;
    let installmentId = (
      await pool.query(installmentIdSql, [
        singleDpsAccountDetails.product_id,
        singleDpsAccountDetails.deposit_amt,
        singleDpsAccountDetails.time_period,
      ])
    )?.rows[0]?.id;
    if (
      Number(singleDpsAccountDetails.deposit_amt) * Number(singleDpsAccountDetails.paid_ins) !=
      Number(singleDpsAccountDetails.current_balance)
    ) {
      throw new BadRequestError("জমাক্রিত টাকা এবং কিস্তি থেকে প্রাপ্ত টাকার পরিমাণ সমান নয়");
    }
    /////////////// calculate pre mature amount ...
    let todate = moment(new Date());
    let todateWithFormat = moment(new Date()).format();
    let accountOpningDate = moment(singleDpsAccountDetails.eff_date);
    let totalInsPaidMonth = todate.diff(accountOpningDate, "months", true);
    let paidMonth = Math.abs(Number(Math.floor(totalInsPaidMonth)));
    let lowMonth = Math.abs(Number(Math.floor(totalInsPaidMonth / 12) * 12));
    let highMonth = Math.abs(Number(Math.ceil(totalInsPaidMonth / 12) * 12));
    let maturityAmount;
    if (
      (todate.isSame(moment(singleDpsAccountDetails.maturity_date).format("DD-MM-YYYY")) ||
        todate.isAfter(moment(singleDpsAccountDetails.maturity_date).format("DD-MM-YYYY"))) &&
      Number(singleDpsAccountDetails.paid_ins) === Number(singleDpsAccountDetails.total_ins)
    ) {
      // console.log("hegtwegfewg");
      maturityAmount = singleDpsAccountDetails.maturity_amount;
      return singleDpsAccountDetails ? toCamelKeys({ ...singleDpsAccountDetails, maturityAmount }) : {};
    }
    const chargeTypeGlSql = `SELECT a.charge_value                                
      FROM   loan.product_charge_mst a
        INNER JOIN loan.product_charge_type b
                ON a.charge_type_id = b.id
                  AND product_id = $1
                  AND b.charge_type = 'CLC' `;
    const chargeAmount = Number(
      (await pool.query(chargeTypeGlSql, [singleDpsAccountDetails.product_id])).rows[0].charge_value
    );

    const preMaturityAmountSql = `SELECT maturity_amount, time_period FROM loan.product_pre_mature_info WHERE product_id =$1 AND time_period =$2 AND interest_id =$3`;
    let preMaturityAmount = (
      await pool.query(preMaturityAmountSql, [singleDpsAccountDetails.product_id, lowMonth, installmentId])
    ).rows;
    let preMaturityAmtValue = preMaturityAmount.length > 0 ? preMaturityAmount[0]?.maturity_amount : 0;

    if (preMaturityAmtValue) {
      if (paidMonth == singleDpsAccountDetails.paid_ins) {
        if (lowMonth == paidMonth) {
          maturityAmount = preMaturityAmtValue;
        } else {
          // console.log("1", {
          //   preMaturityAmtValue: Number(preMaturityAmtValue),
          //   time_period: Number(preMaturityAmount[0]?.time_period),
          //   deposit_amt: Number(singleDpsAccountDetails.deposit_amt),
          // });

          maturityAmount =
            Number(preMaturityAmtValue) +
            (Number(singleDpsAccountDetails.paid_ins) - Number(preMaturityAmount[0]?.time_period)) *
              Number(singleDpsAccountDetails.deposit_amt);
        }
      } else {
        // console.log("2", {
        //   preMaturityAmtValue: Number(preMaturityAmtValue),
        //   time_period: Number(preMaturityAmount[0]?.time_period),
        //   deposit_amt: Number(singleDpsAccountDetails.deposit_amt),
        // });
        preMaturityAmount = (
          await pool.query(preMaturityAmountSql, [
            singleDpsAccountDetails.product_id,
            singleDpsAccountDetails.paid_ins,
            installmentId,
          ])
        ).rows;
        let preMaturityAmtValue = preMaturityAmount.length > 0 ? preMaturityAmount[0]?.maturity_amount : 0;
        const timePeriod = preMaturityAmount[0]?.time_period ? Number(preMaturityAmount[0]?.time_period) : 0;
        maturityAmount =
          (preMaturityAmtValue ? Number(preMaturityAmtValue) : 0) +
          (Number(singleDpsAccountDetails.paid_ins) - timePeriod) * Number(singleDpsAccountDetails.deposit_amt);
      }
    } else {
      maturityAmount = Number(singleDpsAccountDetails.paid_ins) * Number(singleDpsAccountDetails.deposit_amt);
    }

    // charge calculation
    if (chargeAmount > maturityAmount) {
      maturityAmount = 0;
    } else {
      maturityAmount = maturityAmount - chargeAmount;
    }
    return singleDpsAccountDetails
      ? toCamelKeys({ ...singleDpsAccountDetails, maturityAmount: maturityAmount ? maturityAmount : 0 })
      : {};
  }
}
