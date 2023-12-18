import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildInsertSql, buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";

@Service()
export class LoanDashboardServices {
  constructor() { }
  async insertLoanDashboardData() {
    const pool = db.getConnection("master");
    const truncateDashboardSql = `TRUNCATE TABLE dashboard.dashboard_info;`;
    const truncateDashboard = (await pool.query(truncateDashboardSql)).rows;

    //Samity Total Count
    const getDoptorSql = `SELECT id from master.doptor_info`;
    const getOfficeSql = `SELECT id from master.office_info WHERE doptor_id=$1`;
    const getProjectSql = `SELECT id from master.project_info WHERE doptor_id=$1`;
    const doptorData = (await pool.query(getDoptorSql)).rows;

    let samityCount, memberCount, transactionInfo, activeLoanCount;
    //check doptor data not to execute loop //pending
    for (let singleDoptor of doptorData) {
      let officeData = (await pool.query(getOfficeSql, [singleDoptor.id])).rows;
      for (let singleOffice of officeData) {
        let projectData = (await pool.query(getProjectSql, [singleDoptor.id])).rows;
        for (let singleProject of projectData) {
          const samityCountSql = `SELECT COUNT(1)
                                  FROM samity.samity_info  a
                                  WHERE a.doptor_id = $1
                                    AND a.office_id = $2
                                    AND a.project_id = $3`;
          samityCount = (
            await pool.query(samityCountSql, [
              singleDoptor.id,
              singleOffice.id,
              singleProject.id
            ])
          ).rows[0].count;

          //Total Member Count
          const memberCountSql = `SELECT COUNT (1)
                                  FROM samity.customer_info  a
                                  WHERE     a.doptor_id = $1
                                        AND a.office_id = $2
                                        AND a.project_id = $3`;
          memberCount = (
            await pool.query(memberCountSql, [
              singleDoptor.id,
              singleOffice.id,
              singleProject.id
            ])
          ).rows[0].count;

          // loan application details
          const loanApplicationSql = `SELECT CASE WHEN COALESCE (status, 'P') = 'P' THEN COUNT (1) END
                                          total_pending,
                                      CASE
                                          WHEN COALESCE (status, 'P') = 'A' THEN COALESCE (COUNT (1), 0)
                                      END
                                          total_approved,
                                      CASE WHEN COALESCE (status, 'P') = 'R' THEN COUNT (1) END
                                          total_reject,
                                      CASE WHEN COALESCE (status, 'P') = 'C' THEN COUNT (1) END
                                          total_correction
                                      FROM temps.application
                                      WHERE service_id = 7 
                                        AND   doptor_id = $1 
                                        AND   CAST (data ->> 'office_id' AS INTEGER)= $2
                                        AND   project_id = $3
                                      GROUP BY status`;

          const loanApplicationInfo = (
            await pool.query(loanApplicationSql, [
              singleDoptor.id,
              singleOffice.id,
              singleProject.id,
            ])
          ).rows[0];
          //transaction details
          const transactionInfoSql = `SELECT 
                 SUM (member_deposit)               member_deposit,
                 SUM (member_withdrawal)            member_withdrawal,
                 SUM (member_share_deposit)         member_share_deposit,
                 SUM (member_share_withdrawal)      member_share_withdrawal,
                 SUM (loan_disbursed)               loan_disbursed,
                 SUM (principal_repayment)          principal_repayment,
                 SUM (service_charge_repayment)     service_charge_repayment,
                 SUM (dps)                          dps,
                 SUM (fdr)                          fdr
            FROM (SELECT COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'DEP' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_deposit,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'WDL' AND drcr_code = 'D'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_withdrawal,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'SHR' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_share_deposit,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'SHW' AND drcr_code = 'D'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_share_withdrawal,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'LDG' AND drcr_code = 'D'
                                     THEN
                                         tran_amt
                                 END),
                             0)    loan_disbursed,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'REP' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    principal_repayment,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'INC' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    service_charge_repayment,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'DPS' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    DPS,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'FDR' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    FDR
                    FROM samity.samity_info  a
                         INNER JOIN loan.account_info b ON a.id = b.samity_id
                         INNER JOIN loan.transaction_dtl c
                             ON     b.id = c.account_id
                                AND b.doptor_id = c.doptor_id
                                AND b.project_id = c.project_id
                                AND b.office_id = c.office_id
                                AND b.product_id = c.product_id
                   WHERE      a.doptor_id = $1
                         AND a.office_id = $2
                         AND a.project_id = $3
                         AND c.rev_tran_id IS NULL
                  UNION ALL
                  SELECT COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'DEP' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_deposit,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'WDL' AND drcr_code = 'D'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_withdrawal,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'SHR' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_share_deposit,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'SHW' AND drcr_code = 'D'
                                     THEN
                                         tran_amt
                                 END),
                             0)    member_share_withdrawal,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'LDG' AND drcr_code = 'D'
                                     THEN
                                         tran_amt
                                 END),
                             0)    loan_disbursed,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'REP' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    principal_repayment,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'INC' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    service_charge_repayment,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'DPS' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    DPS,
                         COALESCE (
                             SUM (
                                 CASE
                                     WHEN tran_code = 'FDR' AND drcr_code = 'C'
                                     THEN
                                         tran_amt
                                 END),
                             0)    FDR
                    FROM samity.samity_info  a
                         INNER JOIN loan.account_info b ON a.id = b.samity_id
                         INNER JOIN loan.transaction_daily c
                             ON     b.id = c.account_id
                                AND b.doptor_id = c.doptor_id
                                AND b.project_id = c.project_id
                                AND b.office_id = c.office_id
                                AND b.product_id = c.product_id
                   WHERE      a.doptor_id = $1
                         AND a.office_id = $2
                         AND a.project_id = $3
                         AND c.rev_tran_id IS NULL) AA`;
          transactionInfo = (
            await pool.query(transactionInfoSql, [
              singleDoptor.id,
              singleOffice.id,
              singleProject.id,
            ])
          ).rows[0];

          //Total active loan count
          const activeLoanCountSql = `SELECT COUNT (1)
                                      FROM loan.account_info  a
                                      WHERE     a.doptor_id = $1
                                            AND a.office_id = $2
                                            AND a.project_id = $3
                                            AND COALESCE(account_status,'X')='ACT'`;
          activeLoanCount = (await pool.query(activeLoanCountSql, [singleDoptor.id, singleOffice.id, singleProject.id]))
            .rows[0].count;

          //current due
          const currentDueSql = `SELECT SUM (due_principal)      principal_current_due,
                                        SUM (due_service_charge)     service_charge_current_due
                                  FROM (  SELECT   SUM (COALESCE (principal_amount, 0))
                                                  - SUM (COALESCE (principal_paid_amount, 0))    due_principal,
                                                    SUM (COALESCE (interest_amount, 0))
                                                  - SUM (COALESCE (interest_paid_amount, 0))     due_service_charge
                                            FROM loan.account_info b
                                                  INNER JOIN loan.product_mst c ON b.product_id = c.id
                                                  INNER JOIN loan.schedule_info d ON b.samity_id = d.samity_id
                                            WHERE     b.doptor_id = $1
                                                  AND b.office_id = $2
                                                  AND b.project_id = $3
                                                  AND b.account_status = 'ACT'
                                        GROUP BY b.id, due_date
                                          HAVING due_date <= CURRENT_DATE) AA`;
          const currentDueInfo = (
            await pool.query(currentDueSql, [singleDoptor.id, singleOffice.id, singleProject.id])
          ).rows[0];
          //loan schedule details
          const overDueSql = `SELECT
                                  SUM(overdue_principal) AS principal_over_due,
                                  SUM(overdue_service_charge) AS service_charge_over_due
                              FROM (
                                  SELECT
                                      b.id AS account_id,
                                      SUM(COALESCE(principal_amount, 0) - COALESCE(principal_paid_amount, 0)) AS overdue_principal,
                                      SUM(COALESCE(interest_amount, 0) - COALESCE(interest_paid_amount, 0)) AS overdue_service_charge
                                  FROM
                                      loan.product_mst a
                                      INNER JOIN loan.account_info b ON a.id = b.product_id
                                      INNER JOIN loan.global_limit c ON b.id = c.account_id AND c.product_id = a.id
                                      INNER JOIN loan.schedule_info d ON d.product_id = a.id AND d.account_id = b.id AND d.account_id = c.account_id
                                  WHERE
                                      b.doptor_id = $1
                                      AND b.office_id = $2
                                      AND b.project_id = $3
                                      AND b.account_status = 'ACT'
                                  GROUP BY
                                      b.id,
                                      c.disbursed_date,
                                      c.loan_term,
                                      a.grace_period
                                  HAVING
                                      CURRENT_DATE >
                                      (disbursed_date + INTERVAL '1 month' * (COALESCE(c.loan_term, 0)))
                              ) AS AA`;
          const overDueInfo = (
            await pool.query(overDueSql, [singleDoptor.id, singleOffice.id, singleProject.id])
          ).rows[0];
          let { sql, params } = buildInsertSql(`dashboard.dashboard_info`, {
            doptorId: singleDoptor.id, //get from parameter list
            officeId: singleOffice.id, //get from parameter list
            projectId: singleProject.id, //get from parameter list
            totalNumberOfApplication: loanApplicationInfo?.total_pending
              ? Number(loanApplicationInfo.total_pending)
              : 0 + loanApplicationInfo?.total_approved
                ? Number(loanApplicationInfo.total_approved)
                : 0 + loanApplicationInfo?.total_reject
                  ? Number(loanApplicationInfo.total_reject)
                  : 0,
            numberOfPendingApplication: loanApplicationInfo?.total_pending
              ? Number(loanApplicationInfo.total_pending)
              : 0,
            numberOfApprovedApplication: loanApplicationInfo?.total_approved
              ? Number(loanApplicationInfo.total_approved)
              : 0,
            numberOfRejectApplication: loanApplicationInfo?.total_reject ? Number(loanApplicationInfo.total_reject) : 0,
            numberOfCorrectionApplication: loanApplicationInfo?.total_correction
              ? Number(loanApplicationInfo.total_correction)
              : 0,
            numberOfSamity: samityCount ? Number(samityCount) : 0,
            numberOfMember: memberCount ? Number(memberCount) : 0,
            totalNumberOfLoan: activeLoanCount ? Number(activeLoanCount) : 0,
            totalMemberDeposit: transactionInfo?.member_deposit ? Number(transactionInfo.member_deposit) : 0,
            totalMemberWithdrawal: transactionInfo?.member_withdrawal ? Number(transactionInfo.member_withdrawal) : 0,
            totalMemberShareDeposit: transactionInfo?.member_share_deposit
              ? Number(transactionInfo.member_share_deposit)
              : 0,
            totalMemberShareWithdrawal: transactionInfo?.member_share_withdrawal
              ? Number(transactionInfo.member_share_withdrawal)
              : 0,
            totalLoanDisbursment: transactionInfo?.loan_disbursed ? Number(transactionInfo.loan_disbursed) : 0,
            totalLoanRepayment: transactionInfo?.principal_repayment
              ? Number(transactionInfo.principal_repayment)
              : 0 + transactionInfo?.service_charge_repayment
                ? Number(transactionInfo.service_charge_repayment)
                : 0,
            totalPrincipalRepayment: transactionInfo?.principal_repayment
              ? Number(transactionInfo.principal_repayment)
              : 0,
            totalServiceChargeRepayment: transactionInfo?.service_charge_repayment
              ? Number(transactionInfo.service_charge_repayment)
              : 0,
            totalPrincipalDue: currentDueInfo?.principal_current_due ? Number(currentDueInfo.principal_current_due) : 0,
            totalServiceChargeDue: currentDueInfo?.service_charge_current_due ? Number(currentDueInfo.service_charge_current_due) : 0,
            totalPrincipalOverdue: overDueInfo?.principal_over_due ? Number(overDueInfo.principal_over_due) : 0,
            totalServiceChargeOverdue: overDueInfo?.service_charge_over_due ? Number(overDueInfo.service_charge_over_due) : 0
          });
          await pool.query(sql, params);
        }
      }
    }

    return toCamelKeys({ samityCount, memberCount, ...transactionInfo }) || [];
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM dashboard.dashboard_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await db.getConnection("slave").query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM dashboard.dashboard_info";
      result = await db.getConnection("slave").query(queryText);
    }
    return result.rows[0].count;
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }

  async get(allQuery: object, doptorId: number, officeId: number, projectId: number[]) {
    let queryText: string = "";
    let result;
    const pool = db.getConnection("slave");
    const sql: string = `SELECT 
                            COALESCE (sum(total_number_of_application),0)total_number_of_application,
                            COALESCE (sum(number_of_samity),0)total_number_of_samity,
                            COALESCE (sum(number_of_member),0)total_number_of_member,
                            COALESCE (sum(total_member_deposit),0)total_member_deposit,
                            COALESCE (sum(total_member_dps),0)total_member_dps,
                            COALESCE (sum(total_member_fdr),0)total_member_fdr,
                            COALESCE (sum(total_number_of_loan),0)total_number_of_loan,
                            COALESCE (sum(total_loan_disbursment),0)total_loan_disbursment,
                            COALESCE (sum(total_principal_repayment),0)total_principal_repayment,
                            COALESCE (sum(total_principal_due),0)total_principal_due,
                            COALESCE (sum(total_principal_overdue),0)total_principal_overdue,
                            COALESCE (sum(total_service_charge_repayment),0)total_service_charge_repayment,
                            COALESCE (sum(total_service_charge_due),0)total_service_charge_due
                          FROM dashboard.dashboard_info`;
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id");
      const queryText = createSql[1];

      result = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      queryText = `SELECT 
                        COALESCE (sum(total_number_of_application),0)total_number_of_application,
                        COALESCE (sum(number_of_samity),0)total_number_of_samity,
                        COALESCE (sum(number_of_member),0)total_number_of_member,
                        COALESCE (sum(total_member_deposit),0)total_member_deposit,
                        COALESCE (sum(total_member_dps),0)total_member_dps,
                        COALESCE (sum(total_member_fdr),0)total_member_fdr,
                        COALESCE (sum(total_number_of_loan),0)total_number_of_loan,
                        COALESCE (sum(total_loan_disbursment),0)total_loan_disbursment,
                        COALESCE (sum(total_principal_repayment),0)total_principal_repayment,
                        COALESCE (sum(total_principal_due),0)total_principal_due,
                        COALESCE (sum(total_principal_overdue),0)total_principal_overdue,
                        COALESCE (sum(total_service_charge_repayment),0)total_service_charge_repayment,
                        COALESCE (sum(total_service_charge_due),0)total_service_charge_due
                    FROM dashboard.dashboard_info
                    where doptor_id= $1 
                    AND office_id= $2 
                    AND project_id=  ANY($3::INT[])`;

      result = (await pool.query(queryText, [doptorId, officeId, projectId])).rows;
    }
    return result.length > 0 ? toCamelKeys(result) : [];
  }
}
