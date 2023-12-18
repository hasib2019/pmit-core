import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { PoolClient } from "pg";
import moment from "moment";
import lodash from "lodash";

@Service()
export class ProductUpdateApprovalService {
  constructor() {}

  async productUpdateApproval(userId: number, data: any, doptorId: number, transaction: PoolClient) {
    const productInfo = toCamelKeys(data) as any;

    const today = new Date();
    let productMstInfo = {} as any;
    //product master data save
    if (productInfo.productMaster) {
      const productMstData = {
        ...lodash.omit(productInfo.productMaster, ["productId", "openDate"]),
        openDate: moment(new Date(productInfo.productMaster.openDate)).format("DD/MM/YYYY"),
      };

      //remove all null value with key
      const productMstFilterData = lodash.pickBy(productMstData);
      const { sql: productMstSql, params: productMstParams } = buildUpdateWithWhereSql(
        "loan.product_mst",
        {
          id: productInfo.productId,
        },
        productMstFilterData
      );
      productMstInfo = (await transaction.query(productMstSql, productMstParams)).rows[0];
      if (!productMstInfo) {
        const getProductSql = `SELECT * FROM loan.product_mst WHERE id = $1`;
        productMstInfo = (await transaction.query(getProductSql, [productInfo.productId])).rows[0];
      }
    }

    //product service charge save
    if (productInfo?.productServiceCharge) {
      /****************************************** */
      /*need to work for delete product interest*/
      /****************************************** */

      productInfo.productServiceCharge?.map(async (value: any) => {
        if (value.id) {
          const productServiceChargeData = {
            ...lodash.omit(value, ["effectDate"]),
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            updatedBy: userId,
            updatedAt: today,
          } as any;

          //remove all null value with key
          const productServiceChargeFilterData = lodash.pickBy(productServiceChargeData);

          let { sql: productSerCrgSql, params: productSerCrgParams } = buildUpdateWithWhereSql(
            "loan.product_interest",
            { id: value.id },
            {
              ...lodash.omit(productServiceChargeData, "overdueIntRate", "overdueIntrate", "currentdueIntRate"),
              overdueIntRate: productServiceChargeData?.overdueIntRate
                ? productServiceChargeData.overdueIntRate
                : productServiceChargeData?.overdueIntrate
                ? productServiceChargeData.overdueIntrate
                : 0,
              currentdueIntRate: productServiceChargeData?.currentdueIntRate
                ? productServiceChargeData.currentdueIntRate
                : 0,
            }
          );
          await transaction.query(productSerCrgSql, productSerCrgParams);
        } else {
          let { sql: productSerCrgSql, params: productSerCrgParams } = buildInsertSql("loan.product_interest", {
            productId: productInfo.productId,
            ...lodash.omit(value, ["effectDate", "overdueIntRate", "overdueIntrate", "currentdueIntRate"]),
            overdueIntRate: value?.overdueIntRate
              ? value.overdueIntRate
              : value?.overdueIntrate
              ? value.overdueIntrate
              : 0,
            currentdueIntRate: value?.currentdueIntRate ? value.currentdueIntRate : 0,
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            createdBy: userId,
            createdAt: today,
          });
          await transaction.query(productSerCrgSql, productSerCrgParams);
        }
      });
    }

    //product service charge segregation
    if (productInfo?.serviceChargeBivajon) {
      /*****************************************************************/
      /*need to work for delete product service charge segregation*/
      /****************************************************************/
      productInfo.serviceChargeBivajon?.map(async (value: any) => {
        if (value.id) {
          const productServiceChargeSegData = {
            ...lodash.omit(value, ["segregationSectorName"]),
            updatedBy: userId,
            updatedAt: today,
          };

          //remove all null value with key
          const productServiceChargeSegFilterData = lodash.pickBy(productServiceChargeSegData);
          let { sql: productSerCrgSegSql, params: productSerCrgSegParams } = buildUpdateWithWhereSql(
            "loan.service_charge_seg",
            {
              id: value.id,
            },
            productServiceChargeSegFilterData
          );
          await transaction.query(productSerCrgSegSql, productSerCrgSegParams);
        } else {
          let { sql: productSerCrgSegSql, params: productSerCrgSegParams } = buildInsertSql("loan.service_charge_seg", {
            productId: productInfo.productId,
            ...lodash.omit(value, ["segregationSectorName"]),
            createdBy: userId,
            createdAt: today,
          });
          await transaction.query(productSerCrgSegSql, productSerCrgSegParams);
        }
      });
    }

    //product charge save
    if (productInfo?.productCharge) {
      /*****************************************************************/
      /*need to work for delete product charge*/
      /****************************************************************/
      productInfo.productCharge?.map(async (value: any) => {
        if (value.id) {
          const productChargeData = {
            ...lodash.omit(value, ["chargeTypeDesc", "effectDate"]),
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            updatedBy: userId,
            updatedAt: today,
          };

          //remove all null value with key
          const productChargeFilterData = lodash.pickBy(productChargeData);
          let { sql: productChargeSql, params: productChargeParams } = buildUpdateWithWhereSql(
            "loan.product_charge_mst",
            {
              id: value.id,
            },
            productChargeFilterData
          );
          await transaction.query(productChargeSql, productChargeParams);
        } else {
          let { sql: productChargeSql, params: productChargeParams } = buildInsertSql("loan.product_charge_mst", {
            productId: productInfo.productId,
            ...lodash.omit(value, ["chargeTypeDesc", "effectDate"]),
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            createdBy: userId,
            createdAt: today,
          });
          await transaction.query(productChargeSql, productChargeParams);
        }
      });
    }

    //product sanction policy save
    if (productInfo?.slabWiseLoanAmount) {
      /*****************************************************************/
      /*need to work for delete product sanction policy*/
      /****************************************************************/

      productInfo?.slabWiseLoanAmount?.map(async (value: any) => {
        if (value.id) {
          const slabWiseLoanAmountData = {
            projectId: productMstInfo.project_id ? productMstInfo.project_id : productInfo.projectId,
            ...value,
            updatedBy: userId,
            updatedAt: today,
          };

          //remove all null value with key
          const slabWiseLoanAmountFilterData = lodash.pickBy(slabWiseLoanAmountData);
          let { sql: productSancPolicySql, params: productSancPolicyParams } = buildUpdateWithWhereSql(
            "loan.product_sanction_policy",
            {
              id: value.id,
            },
            slabWiseLoanAmountFilterData
          );
          await transaction.query(productSancPolicySql, productSancPolicyParams);
        } else {
          let { sql: productSancPolicySql, params: productSancPolicyParams } = buildInsertSql(
            "loan.product_sanction_policy",
            {
              doptorId: doptorId,
              projectId: productInfo.projectId,
              productId: productInfo.productId,
              ...value,
              createdBy: userId,
              createdAt: today,
            }
          );
          await transaction.query(productSancPolicySql, productSancPolicyParams);
        }
      });
    }

    //product document mapping save
    if (productInfo?.necessaryDocument) {
      productInfo.necessaryDocument?.map(async (value: any) => {
        if (value.id) {
          /*****************************************************************/
          /*need to work for delete product neccessary documents*/
          /****************************************************************/

          const productDocumentsData = {
            projectId: productMstInfo.project_id ? productMstInfo.project_id : productInfo.projectId,
            ...lodash.omit(value, ["docTypeDesc"]),
            updatedBy: userId,
            updatedAt: today,
          };

          //remove all null value with key
          const productDocumentsFilterData = lodash.pickBy(productDocumentsData);
          let { sql: productDocMapSql, params: productDocMapParams } = buildUpdateWithWhereSql(
            "loan.product_document_mapping",
            { id: value.id },
            productDocumentsFilterData
          );
          await transaction.query(productDocMapSql, productDocMapParams);
        } else {
          let { sql: productDocMapSql, params: productDocMapParams } = buildInsertSql("loan.product_document_mapping", {
            doptorId: doptorId,
            projectId: productMstInfo.project_id,
            productId: productMstInfo.id,
            ...lodash.omit(value, ["docTypeDesc"]),
            createdBy: userId,
            createdAt: today,
          });
          await transaction.query(productDocMapSql, productDocMapParams);
        }
      });
    }

    if (productInfo?.productSerCrgDel) {
      productInfo.productSerCrgDel?.map(async (id: number) => {
        let { sql: productSerCrgDelSql, params: productSerCrgDelParams } = buildUpdateWithWhereSql(
          "loan.product_interest",
          { id },
          { isActive: false }
        );
        await transaction.query(productSerCrgDelSql, productSerCrgDelParams);
      });
    }

    if (productInfo?.productSerCrgSegDel) {
      productInfo.productSerCrgSegDel?.map(async (id: number) => {
        let { sql: productSerCrgSegDelSql, params: productSerCrgSegDelParams } = buildUpdateWithWhereSql(
          "loan.service_charge_seg",
          { id },
          { isActive: false }
        );
        await transaction.query(productSerCrgSegDelSql, productSerCrgSegDelParams);
      });
    }

    if (productInfo?.productChargeDel) {
      productInfo.productChargeDel?.map(async (id: number) => {
        let { sql: productChargeDelSql, params: productChargeDelParams } = buildUpdateWithWhereSql(
          "loan.product_charge_mst",
          { id },
          { isActive: false }
        );
        await transaction.query(productChargeDelSql, productChargeDelParams);
      });
    }

    if (productInfo?.productSanctionPolicyDel) {
      productInfo.productSanctionPolicyDel?.map(async (id: number) => {
        let { sql: productSanctionPolicyDelSql, params: productSanctionPolicyDelParams } = buildUpdateWithWhereSql(
          "loan.product_sanction_policy",
          { id },
          { isActive: false }
        );
        await transaction.query(productSanctionPolicyDelSql, productSanctionPolicyDelParams);
      });
    }

    if (productInfo?.productDocumentsDel) {
      productInfo.productDocumentsDel?.map(async (id: number) => {
        let { sql: productDocumentsDelSql, params: productDocumentsDelParams } = buildUpdateWithWhereSql(
          "loan.product_document_mapping",
          { id },
          { isActive: false }
        );
        await transaction.query(productDocumentsDelSql, productDocumentsDelParams);
      });
    }

    return productMstInfo;
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
