import { toCamelKeys } from "keys-transform";
import { Pool } from "pg";
import { Service } from "typedi";
import db from "../../../db/connection.db";
// import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { minioPresignedGet } from "../../../utils/minio.util";

@Service()
export default class SavingsProductService {
  constructor() { }
  async getAppHistory(appId: Number, pool: Pool) {
    const appHistorySql = `
            SELECT 
              a.id, 
              a.user_id, 
              a.application_id, 
              a.service_action_id, 
              a.remarks, 
              to_char("action_date", 'DD/MM/YYYY') as action_date,
              a.office_id, 
              a.employee_Id, 
              f.name_bn, 
              a.attachment, 
              b.username, 
              c.name_bn as office_name_bangla,
              g.name_bn as designation, 
              d.service_id, 
              arr.item_object ->> 'action_text' as action_text 
            FROM 
              temps.application_approval a 
              INNER JOIN users.user b ON b.id = a.user_id 
              INNER JOIN master.office_info c ON c.id = a.office_id 
              INNER JOIN temps.application d ON d.id = a.application_id 
              INNER JOIN master.service_info e ON e.id = d.service_id 
              LEFT JOIN master.office_employee f ON f.designation_id = a.designation_id 
              INNER JOIN master.office_designation g ON f.designation_id = g.id 
              JOIN jsonb_array_elements(e.service_action) with ordinality arr(item_object, position) ON arr.position = a.service_action_id 
            WHERE 
              application_id = $1 
            ORDER BY 
              a.id ASC`;
    const appHistory = (await pool.query(appHistorySql, [appId])).rows;
    let appHistoryWithUrl = [];
    for (const singleAppHistory of appHistory) {
      if (singleAppHistory.attachment.file_name) {
        let dataWithUrl = await minioPresignedGet(singleAppHistory, ["attachment.file_name"]);
        appHistoryWithUrl.push(dataWithUrl);
      } else {
        appHistoryWithUrl.push(singleAppHistory);
      }
    }

    return appHistoryWithUrl.length > 0 ? toCamelKeys(appHistoryWithUrl) : [];
  }
  async getSavingsProductAppInfo(appId: Number, type: string, componentId: Number, pool: Pool) {
    const appDataSql = `
            SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    const camelCaseAppData = toCamelKeys(appData.data) as any;

    const getGlNameSql = `SELECT glac_name FROM loan.glac_mst WHERE id = $1`;
    const getChargeTypeNameSql = `SELECT charge_type_desc FROM loan.product_charge_type WHERE id = $1`;
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;

    if (camelCaseAppData?.productCharge) {
      camelCaseAppData.productCharge?.map(async (value: any, index: number) => {
        let chargeCreditGlName = (await pool.query(getGlNameSql, [value.chargeCreditgl])).rows[0].glac_name;
        let chargeFullName = (await pool.query(getChargeTypeNameSql, [value.chargeName])).rows[0].charge_type_desc;

        camelCaseAppData.productCharge[index] = {
          ...camelCaseAppData.productCharge[index],
          chargeCreditGlName,
          chargeFullName,
        };
      });
    }

    if (camelCaseAppData?.neccessaryDocument) {
      camelCaseAppData.neccessaryDocument?.map(async (value: any, index: number) => {
        let docFullName = (await pool.query(getDocTypeNameSql, [value.docType])).rows[0].doc_type_desc;
        console.log(docFullName);

        camelCaseAppData.neccessaryDocument[index] = {
          ...camelCaseAppData.neccessaryDocument[index],
          docFullName,
        };
      });
    }
    const finalInfo = {
      type: type,
      applicationInfo: {
        ...camelCaseAppData,
        applicationId: appId,
        serviceId: appData.service_id,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
  async getApprovedSingleProduct(productId: number) {
    const pool = db.getConnection("slave");
    const productMstSql = `SELECT A.*,
                              B.PROJECT_NAME_BANGLA
                            FROM LOAN.PRODUCT_MST A
                            INNER JOIN MASTER.PROJECT_INFO B ON B.ID = A.PROJECT_ID
                            WHERE A.ID = $1`;
    //fetching results from db
    const productMaster = (await pool.query(productMstSql, [productId])).rows[0];
    const productInterestSql = `SELECT ID,
                                EFFECT_DATE,
                                MATURITY_AMOUNT,
                                INS_AMT,
                                IS_ACTIVE,
                                INT_RATE,
                                TIME_PERIOD
                              FROM LOAN.PRODUCT_INTEREST
                              WHERE PRODUCT_ID = $1`;

    const productInterest = (await pool.query(productInterestSql, [productId])).rows;

    const productPreMatureSql = `SELECT A.ID,
                                    A.INTEREST_RATE,
                                    A.MATURITY_AMOUNT,
                                    A.TIME_PERIOD,
                                    A.INTEREST_ID
                                  FROM LOAN.PRODUCT_PRE_MATURE_INFO A
                                  WHERE A.PRODUCT_ID = $1`;
    const productPreMature = (await pool.query(productPreMatureSql, [productId])).rows;
    // productInstallment.length >= 1 &&
    //   productInstallment.map((value: any) => {
    //     value.ins_amt = parseFloat(value.ins_amt);
    //   });
    const productChargeSql = `SELECT A.ID,
                              A.CHARGE_TYPE_ID,
                              B.CHARGE_TYPE_DESC,
                              A.CHARGE_GL,
                              A.CHARGE_VALUE,
                              A.EFFECT_DATE,
                              A.IS_ACTIVE,
                              C.GLAC_NAME
                            FROM LOAN.PRODUCT_CHARGE_MST A
                            INNER JOIN LOAN.PRODUCT_CHARGE_TYPE B ON B.ID = A.CHARGE_TYPE_ID
                            INNER JOIN LOAN.GLAC_MST C ON C.ID = CAST(A.CHARGE_GL AS int)
                            WHERE A.PRODUCT_ID = $1`;
    const productCharge = (await pool.query(productChargeSql, [productId])).rows;
    productCharge.map((value: any) => {
      value.charge_value = Number(value.charge_value);
    });

    const productDocSql = `SELECT A.ID,
                            A.DOC_TYPE_ID,
                            B.DOC_TYPE_DESC,
                            A.IS_MANDATORY
                          FROM LOAN.PRODUCT_DOCUMENT_MAPPING A
                          INNER JOIN MASTER.DOCUMENT_TYPE B ON B.ID = A.DOC_TYPE_ID
                          WHERE A.PRODUCT_ID = $1
                            AND A.IS_ACTIVE = TRUE
                            AND B.IS_ACTIVE = TRUE`;
    const productDocuments = (await pool.query(productDocSql, [productId])).rows;

    return toCamelKeys({
      productMaster,
      productInterest,
      productPreMature,
      productCharge,
      productDocuments,
    });
  }
}
