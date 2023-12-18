import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import { PoolClient } from "pg";

@Service()
export class SavingsProductApprovalService {
  constructor() {}

  async savingsProductApproval(userId: number, data: any, doptorId: number, transaction: PoolClient) {
    const productInfo = toCamelKeys(data) as any;
    console.log("data-----", data);

    const today = new Date();
    //product master data save
    const { sql: productMstSql, params: productMstParams } = buildInsertSql("loan.product_mst", {
      doptorId: doptorId,
      projectId: productInfo.productMaster.projectId,
      productCode: productInfo.productMaster.productCode,
      productName: productInfo.productMaster.productName,
      productDescription: productInfo.productMaster.productDescription,
      productType: "L",
      openDate: new Date(),
      depositNature: productInfo.productMaster.savingsType,
      intPostPeriod: productInfo.productMaster.profitPostingPeriod,
      repFrq: productInfo.productMaster.repaymentFrequency,
      fineAllow: productInfo.productMaster.fineAllow || false,
      insStartDay: productInfo.productMaster.insStartDay,
      defaultAmt: productInfo.productMaster.realizableSavings || null,
      insEndDay: productInfo.productMaster.insEndDay,
      insHolidayConsideration: productInfo.productMaster.considerationOfHolidays || false,
      maxDefaultInsAllow: productInfo.productMaster.maxDefaultInsAllow,
      defaultAction: productInfo.productMaster.defaultAction,
      afterMaturityInsAllow: productInfo.productMaster.afterMaturityInsMaxAllow || false,
      maturityMaxDay: productInfo.productMaster.maturityMaxDay,
      maturityAmtInstruction: productInfo.productMaster.maturityAmtInstruction,
      minLoanAmt: productInfo.productMaster.minInsAmt,
      maxLoanAmt: productInfo.productMaster.maxInsAmt,
      depMultiplyBy: productInfo.productMaster.depMultiplyBy,
      createdBy: userId,
      createdAt: today,
    });

    const productMstInfo = (await transaction.query(productMstSql, productMstParams)).rows[0];

    //product profit save
    if (productInfo?.productInterest) {
      for (let value of productInfo?.productInterest) {
        let { sql: productProfitSql, params: productProfitParams } = buildInsertSql("loan.product_interest", {
          productId: productMstInfo.id,
          intRate: value.profitRate,
          effectDate: new Date(value.effectDate).toLocaleDateString("en-GB"),
          insAmt: value.insAmt,
          maturityAmount: value.maturityAmount,
          timePeriod: value.duration,
          isActive: value?.status ? value.status : false,
          createdBy: userId,
          createdAt: today,
        });
        const productInterestResp = (await transaction.query(productProfitSql, productProfitParams)).rows[0];
        //product premature save
        if (productInfo?.productPreMature && productInfo?.productPreMature.length > 0) {
          for (let element of value?.productPreMature) {
            let { sql: productPreMatureSql, params: productPreMatureParams } = buildInsertSql(
              "loan.product_pre_mature_info",
              {
                productId: productMstInfo.id,
                interestId: productInterestResp?.id,
                interestRate: element?.profitRate,
                timePeriod: +element?.timePeriod * 12,
                maturityAmount: element?.maturityAmount,
                createdBy: userId,
                createdAt: today,
              }
            );
            await transaction.query(productPreMatureSql, productPreMatureParams);
          }
        }
      }
    }

    //product charge save
    productInfo?.productCharge?.map(async (value: any) => {
      let { sql: productChargeSql, params: productChargeParams } = buildInsertSql("loan.product_charge_mst", {
        productId: productMstInfo.id,
        effectDate: new Date(value.effectDate).toLocaleDateString("en-GB"),
        chargeTypeId: value?.chargeName ? value.chargeName : null,
        chargeValue: value?.chargeAmount ? value.chargeAmount : null,
        chargeGl: value?.chargeCreditgl ? value.chargeCreditgl : null,
        isActive: value?.chargeActive,
        chargeNature: value.chargeType,
        createdBy: userId,
        createdAt: today,
      });
      await transaction.query(productChargeSql, productChargeParams);
    });

    //product document mapping save
    productInfo?.neccessaryDocument?.map(async (value: any) => {
      let { sql: productDocMapSql, params: productDocMapParams } = buildInsertSql("loan.product_document_mapping", {
        doptorId: doptorId,
        projectId: productMstInfo.project_id,
        productId: productMstInfo.id,
        docTypeId: value.docType,
        isMandatory: value.status,
        createdBy: userId,
        createdAt: today,
      });
      await transaction.query(productDocMapSql, productDocMapParams);
    });

    return productMstInfo;
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
