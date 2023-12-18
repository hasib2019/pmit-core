import { toCamelKeys } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { Container } from "typedi";
import ApiRequestLogServices from "./request-log.service";

@Service()
export default class MemberFinancialServices {
  constructor() {}

  async getCustomerFinancialInfo(
    requestData: { query: any; param: any; body: any },
    officeId: number,
    originSamityId: number,
    apiKey: string,
    originalRoutePath: string
  ) {
    const pool = db.getConnection("master");

    const userAndServiceInfoSql = `SELECT 
                                    a.id service_id, 
                                    c.id user_id 
                                  FROM 
                                    api.routes a 
                                    INNER JOIN api.api_user_route_access b ON b.route_id = a.id 
                                    INNER JOIN users.api_users c ON c.id = b.user_id 
                                  WHERE 
                                    a.path = $1 
                                    AND c.api_key = $2`;
    const userAndServiceInfo = (await pool.query(userAndServiceInfoSql, [originalRoutePath, apiKey])).rows[0];
    if (!userAndServiceInfo) throw new BadRequestError("এপিআই রিকুয়েস্টে অনুমতি নেই");
    const apiRequestLogServices: ApiRequestLogServices = Container.get(ApiRequestLogServices);

    try {
      //samity info
      const samitySql = `SELECT 
                          DISTINCT a.origin_samity_id,
                          a.id loan_component_samity_id, 
                          a.samity_code, 
                          a.samity_name, 
                          a.doptor_id, 
                          a.office_id, 
                          b.name_bn, 
                          a.project_id, 
                          c.project_name_bangla, 
                          a.district_id, 
                          d.district_name_bangla, 
                          a.upa_city_id, 
                          a.upa_city_Type, 
                          d.upa_city_name_bangla, 
                          a.uni_thana_paw_id, 
                          a.uni_thana_paw_type, 
                          d.uni_thana_paw_name_bangla, 
                          a.address, 
                          e.name fo_name
                        FROM 
                          samity.samity_info a 
                          LEFT JOIN master.office_info b ON b.id = a.office_id 
                          LEFT JOIN master.project_info c ON c.id = a.project_id 
                          LEFT JOIN master.mv_union_thana_paurasabha_info d ON d.district_id = a.district_id 
                          AND d.upa_city_id = a.upa_city_id 
                          AND d.upa_city_type = a.upa_city_type 
                          AND d.uni_thana_paw_id = a.uni_thana_paw_id 
                          LEFT JOIN users.user e ON e.id = a.fo_user_id 
                        WHERE
                          a.office_id = $1
                          AND origin_samity_id = $2`;
      let samityInfo = (await pool.query(samitySql, [officeId, originSamityId])).rows[0];
      if (!samityInfo) throw new BadRequestError("সমিতিটি বিদ্যমান নেই");

      //member info
      const memberSql = `SELECT 
                        a.origin_customer_id,
                        a.id loan_component_customer_id, 
                        a.customer_code, 
                        a.name_bn, 
                        a.name_en, 
                        a.father_name, 
                        a.mother_name, 
                        a.birth_date, 
                        a.mobile, 
                        a.email, 
                        a.religion, 
                        religion_master.display_value AS religion_name, 
                        a.gender, 
                        gender_master.display_value AS gender_name, 
                        a.marital_status, 
                        marital_status_master.display_value AS marital_status_name, 
                        a.spouse_name, 
                        a.education, 
                        education_master.display_value AS education_name, 
                        a.occupation, 
                        occupation_master.display_value AS occupation_name, 
                        a.yearly_income, 
                        a.age, 
                        a.customer_status
                      FROM 
                        samity.customer_info a 
                        LEFT JOIN master.code_master religion_master ON religion_master.id = a.religion 
                        LEFT JOIN master.code_master gender_master ON gender_master.id = a.gender 
                        LEFT JOIN master.code_master marital_status_master ON marital_status_master.id = a.marital_status 
                        LEFT JOIN master.code_master education_master ON education_master.id = a.education 
                        LEFT JOIN master.code_master occupation_master ON occupation_master.id = a.occupation 
                      WHERE 
                        samity_id = $1
                      ORDER BY 
                        a.id`;
      let customerInfo = (await pool.query(memberSql, [samityInfo.loan_component_samity_id])).rows;
      if (!customerInfo || !customerInfo[0]) throw new BadRequestError("সমিতিটিতে কোন সদস্য বিদ্যমান নেই");

      const customerFinancialInfoSql = `SELECT 
                                          e.project_name_bangla, 
                                          b.product_name, 
                                          a.account_no, 
                                          a.account_status, 
                                          a.close_date, 
                                          c.sanction_limit loan_amount, 
                                          c.sanction_date, 
                                          c.disbursed_date, 
                                          c.profit_amount service_charge, 
                                          f.id loan_purpose_id, 
                                          f.purpose_name, 
                                          SUM(principal_amount):: INTEGER loan_amount, 
                                          COALESCE(
                                            SUM(principal_paid_amount), 
                                            0
                                          ):: INTEGER principal_paid_amount, 
                                          COALESCE(
                                            SUM(interest_paid_amount), 
                                            0
                                          ):: INTEGER interest_paid_amount, 
                                          (
                                            SUM(principal_amount)- COALESCE(
                                              SUM(principal_paid_amount), 
                                              0
                                            )
                                          ):: INTEGER due_principal, 
                                          (
                                            SUM(interest_amount)- COALESCE(
                                              SUM(interest_paid_amount), 
                                              0
                                            )
                                          ):: INTEGER due_interest, 
                                          SUM(interest_rebate_amount):: INTEGER interest_rebate_amount, 
                                          (
                                            (
                                              SUM(principal_amount)- COALESCE(
                                                SUM(principal_paid_amount), 
                                                0
                                              )
                                            )+(
                                              SUM(interest_amount)- COALESCE(
                                                SUM(interest_paid_amount), 
                                                0
                                              )
                                            )
                                          ):: INTEGER total_due_amount 
                                        FROM 
                                          loan.account_info a 
                                          INNER JOIN loan.product_mst b ON b.id = a.product_id 
                                          INNER JOIN loan.global_limit c ON c.account_id = a.id 
                                          INNER JOIN loan.schedule_info d ON d.account_id = a.id 
                                          INNER JOIN master.project_info e ON e.id = c.project_id 
                                          INNER JOIN master.loan_purpose f ON f.id = c.purpose_id 
                                        WHERE 
                                          a.samity_id = $1 
                                          AND a.customer_id = $2 
                                        GROUP BY 
                                          product_name, 
                                          account_no, 
                                          account_status, 
                                          close_date, 
                                          sanction_limit, 
                                          sanction_date, 
                                          disbursed_date, 
                                          profit_amount, 
                                          project_name_bangla, 
                                          loan_purpose_id, 
                                          purpose_name`;

      //member financial info
      for (let [index, singleCustomer] of customerInfo.entries()) {
        let customerFinancialInfo = (
          await pool.query(customerFinancialInfoSql, [
            samityInfo.loan_component_samity_id,
            singleCustomer.loan_component_customer_id,
          ])
        ).rows;
        customerInfo[index] = {
          ...customerInfo[index],
          customerFinancialInfo: customerFinancialInfo && customerFinancialInfo[0] ? customerFinancialInfo : [],
        };
      }

      samityInfo = { ...samityInfo, customerInfo };

      //api request success log data
      const logData = {
        requestDate: new Date(),
        serviceType: userAndServiceInfo?.service_id,
        userId: userAndServiceInfo?.user_id,
        requestInfo: JSON.stringify(requestData),
        responseInfo: JSON.stringify(samityInfo),
        requestStatus: "SUCCESS",
        resStatusCode: 200,
        errorMessage: null,
        createdBy: userAndServiceInfo?.service_id,
      };
      await apiRequestLogServices.createExternalApiRequestLog(pool, logData);

      return samityInfo ? toCamelKeys(samityInfo) : {};
    } catch (error: any) {
      //api request error log data
      const logData = {
        requestDate: new Date(),
        serviceType: userAndServiceInfo?.service_id,
        userId: userAndServiceInfo?.user_id,
        requestInfo: JSON.stringify(requestData),
        responseInfo: null,
        requestStatus: "FAIL",
        resStatusCode: error.statusCode || 500,
        errorMessage: error.message || "Internal Server Error",
        createdBy: userAndServiceInfo?.service_id,
      };
      await apiRequestLogServices.createExternalApiRequestLog(pool, logData);

      throw error;
    }
  }
}
