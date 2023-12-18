import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import { PoolClient } from "pg";

@Service()
export class ProductApprovalService {
  constructor() {}

  async productApproval(userId: number, data: any, doptorId: number, transaction: PoolClient) {
    const productInfo = toCamelKeys(data) as any;
    const today = new Date();
    //product master data save
    const { sql: productMstSql, params: productMstParams } = buildInsertSql("loan.product_mst", {
      doptorId: doptorId,
      projectId: productInfo.productMaster.projectName,
      productCode: productInfo.productMaster.productCode,
      productName: productInfo.productMaster.productName,
      productType: "A",
      depositNature: "L",
      openDate: new Date(productInfo.productMaster.productStartDate).toLocaleDateString("en-GB"),
      minLoanAmt: productInfo.productMaster.lowestLoanAmount,
      maxLoanAmt: productInfo.productMaster.highestLoanAmount,
      repFrq: productInfo.productMaster.repaymentRequency,
      calType: productInfo.productMaster.calculationMethod,
      productGl: productInfo.productMaster.productGl,
      allowGracePeriod: productInfo.productMaster.gracePeriodAllowed,
      gracePeriod: productInfo.productMaster.gracePeriod ? productInfo.productMaster.gracePeriod : null,
      serCrgAtGracePeriod: productInfo.productMaster.gPServChargeAllowed
        ? productInfo.productMaster.gPServChargeAllowed
        : null,
      graceAmtRepayIns: productInfo.productMaster.gPServChargeDir ? productInfo.productMaster.gPServChargeDir : null,
      principalGl: productInfo.productMaster.capitalGl,
      serviceChargeGl: productInfo.productMaster.serviceChargeGl,
      allowInsurance: productInfo.productMaster.insuranceAllowed,
      insuranceGl: productInfo.productMaster.insuranceGl ? productInfo.productMaster.insuranceGl : null,
      insurancePercent: productInfo.productMaster.insuPerRate ? productInfo.productMaster.insuPerRate : null,
      numberOfInstallment: productInfo.productMaster.numberOfInstallment,
      holidayEffect: productInfo.productMaster.holidayEffect,
      chequeDisbursementFlag: productInfo.productMaster.chequeDisbursementFlag,
      chequeDisbursementGl: productInfo?.productMaster?.chequeDisbursementGl
        ? productInfo.productMaster.chequeDisbursementGl
        : null,
      loanTerm: productInfo.productMaster.loanTerm,
      isAdvPayBenefit: productInfo.productMaster.isAdvPayBenefit,
      realizationSeqPrincipal: productInfo.productMaster.sequentialOrderCapital,
      realizationSeqService: productInfo.productMaster.sequentialOrderSerCharge,
      realizationSeqOd: productInfo.productMaster.sequentialOrderDelayCharge,
      isMultipleDisbursementAllow: productInfo.productMaster.isMultipleDisbursementAllow,
      isMultipleLoanAllow: productInfo.productMaster.isMultipleLoanAllow,
      allowPercent: productInfo.productMaster.allowPercent || null,
      createdBy: userId,
      createdAt: today,
    });
    const productMstInfo = (await transaction.query(productMstSql, productMstParams)).rows[0];

    //product service charge save
    productInfo?.productServiceCharge?.map(async (value: any) => {
      let { sql: productSerCrgSql, params: productSerCrgParams } = buildInsertSql("loan.product_interest", {
        productId: productMstInfo.id,
        intRate: value.serviceChargeRate,
        effectDate: new Date(value.startDate).toLocaleDateString("en-GB"),
        overdueIntRate: value?.lateServiceChargeRate ? value.lateServiceChargeRate : 0,
        currentdueIntRate: value?.expireServiceChargeRate ? value.expireServiceChargeRate : 0,
        isActive: value?.activeToggle ? value.activeToggle : false,
        createdBy: userId,
        createdAt: today,
      });
      await transaction.query(productSerCrgSql, productSerCrgParams);
    });

    //product service charge segregation
    productInfo?.serviceChargeBivajon?.map(async (value: any) => {
      let { sql: productSerCrgSegSql, params: productSerCrgSegParams } = buildInsertSql("loan.service_charge_seg", {
        productId: productMstInfo.id,
        segregationId: value.sectorName,
        segregationRate: value?.percentage ? value.percentage : null,
        glId: value?.generalLedgerName ? value.generalLedgerName : null,
        isActive: value?.activeToggle ? value.activeToggle : false,
        createdBy: userId,
        createdAt: today,
      });
      await transaction.query(productSerCrgSegSql, productSerCrgSegParams);
    });

    //product charge save
    productInfo?.productCharge?.map(async (value: any) => {
      let { sql: productChargeSql, params: productChargeParams } = buildInsertSql("loan.product_charge_mst", {
        productId: productMstInfo.id,
        effectDate: new Date(value.startDate).toLocaleDateString("en-GB"),
        chargeTypeId: value?.chargeName ? value.chargeName : null,
        chargeValue: value?.chargeAmount ? value.chargeAmount : null,
        chargeGl: value?.chargeCreditgl ? value.chargeCreditgl : null,
        isActive: value?.chargeActive ? value.chargeActive : false,
        createdBy: userId,
        createdAt: today,
      });
      await transaction.query(productChargeSql, productChargeParams);
    });

    //product sanction policy save
    productInfo?.slabWiseLoanAmount?.map(async (value: any) => {
      let { sql: productSancPolicySql, params: productSancPolicyParams } = buildInsertSql(
        "loan.product_sanction_policy",
        {
          doptorId: doptorId,
          projectId: productMstInfo.project_id,
          productId: productMstInfo.id,
          loanNo: value?.loanNumber ? value.loanNumber : null,
          minAmount: value?.lowestAmount ? value.lowestAmount : 0,
          maxAmount: value?.highestAmount ? value.highestAmount : 0,
          preDisbInterval: value?.pastLoanDifference ? value.pastLoanDifference : 0,
          depositPercent: value?.perOfSavings ? value.perOfSavings : 0,
          sharePercent: value?.perOfShares ? value.perOfShares : 0,
          createdBy: userId,
          createdAt: today,
        }
      );
      await transaction.query(productSancPolicySql, productSancPolicyParams);
    });

    //product document mapping save
    productInfo?.necessaryDocument?.map(async (value: any) => {
      let { sql: productDocMapSql, params: productDocMapParams } = buildInsertSql("loan.product_document_mapping", {
        doptorId: doptorId,
        projectId: productMstInfo.project_id,
        productId: productMstInfo.id,
        docTypeId: value.docName,
        isMandatory: value.mendatory,
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
