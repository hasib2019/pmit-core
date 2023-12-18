import { toCamelKeys, toSnakeCase } from "keys-transform";
import { BadRequestError, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { buildInsertSql } from "../../../utils/sql-builder.util";
import lodash from "lodash";
import { PoolClient } from "pg";

@Service()
export default class SanctionService {
  constructor() {}

  //get product info by samity id
  async getProductList(
    doptorId: number,
    projectId: number | null,
    productType?: string | null,
    depositNature?: string | null
  ) {
    const pool = db.getConnection("slave");
    let sql;
    let result = [];
    if (productType && depositNature) {
      sql = `SELECT 
              DISTINCT ON(a.id) a.id, 
              a.doptor_id, 
              a.product_name, 
              a.product_type, 
              a.deposit_nature, 
              a.min_loan_amt, 
              a.max_loan_amt, 
              a.cal_type, 
              a.rep_frq, 
              a.allow_grace_period, 
              a.grace_amt_repay_ins, 
              a.grace_period, 
              a.ser_crg_at_grace_period, 
              a.product_gl, 
              a.default_amt, 
              a.number_of_installment, 
              a.holiday_effect, 
              a.loan_term, 
              b.int_rate, 
              b.overdue_int_rate, 
              b.currentdue_int_rate, 
              b.time_period, 
              b.maturity_amount, 
              a.installment_amount_method, 
              a.installment_division_digit 
            FROM 
              loan.product_mst a 
              LEFT JOIN loan.product_interest b ON a.id = b.product_id 
            WHERE 
              (
                CASE WHEN CAST($2 AS INTEGER) IS NULL THEN a.doptor_id = $1 ELSE a.doptor_id = $1 
                AND a.project_id = $2 END
              ) 
              AND (
                CASE WHEN CAST($4 AS VARCHAR) != 'S' THEN b.is_active = TRUE ELSE TRUE END
              ) 
              AND a.product_type = $3 
              AND a.deposit_nature = $4 
            ORDER BY 
              a.id`;
      result = (await pool.query(sql, [doptorId, projectId, productType, depositNature])).rows;
    } else if (productType && !depositNature) {
      sql = `SELECT
              DISTINCT ON(a.id)
              a.id, 
              a.doptor_id, 
              a.product_name, 
              a.product_type, 
              a.deposit_nature, 
              a.min_loan_amt, 
              a.max_loan_amt, 
              a.cal_type, 
              a.rep_frq, 
              a.allow_grace_period, 
              a.grace_amt_repay_ins, 
              a.grace_period, 
              a.ser_crg_at_grace_period, 
              a.product_gl, 
              a.default_amt, 
              a.number_of_installment, 
              a.holiday_effect, 
              a.loan_term, 
              b.int_rate, 
              b.overdue_int_rate, 
              b.currentdue_int_rate,
              b.time_period,
              b.maturity_amount,
              a.installment_amount_method,
              a.installment_division_digit
            FROM 
              loan.product_mst a 
              LEFT JOIN loan.product_interest b ON a.id = b.product_id 
            WHERE 
              CASE WHEN CAST($2 AS INTEGER) IS NULL THEN a.doptor_id = $1 ELSE a.doptor_id = $1 
              AND a.project_id = $2 END 
              AND a.product_type = $3 
              AND b.is_active = TRUE
            ORDER BY 
              a.id`;
      result = (await pool.query(sql, [doptorId, projectId, productType])).rows;
    } else {
      sql = `SELECT 
              a.id, 
              a.product_name, 
              a.product_type, 
              a.deposit_nature, 
              a.min_loan_amt, 
              a.max_loan_amt, 
              a.cal_type, 
              a.rep_frq, 
              a.allow_grace_period, 
              a.grace_amt_repay_ins, 
              a.grace_period, 
              a.ser_crg_at_grace_period, 
              a.product_gl, 
              a.default_amt, 
              a.number_of_installment, 
              b.int_rate, 
              b.overdue_int_rate, 
              b.currentdue_int_rate 
            FROM 
              loan.product_mst a 
              LEFT JOIN loan.product_interest b ON a.id = b.product_id 
            WHERE 
              CASE WHEN CAST($2 AS INTEGER) IS NULL THEN a.doptor_id = $1 ELSE a.doptor_id = $1 
              AND a.project_id = $2 END
            ORDER BY 
              a.id`;
      result = (await pool.query(sql, [doptorId, projectId])).rows;
    }
    return result[0] ? toCamelKeys(result) : [];
  }

  //get sanction message
  async getMessage(id: number, projectId: number, productId: number) {
    const pool = db.getConnection("slave");
    let sql;
    sql = `SELECT last_loan_amount FROM samity.customer_info where id = $1`;
    const allLoanStatus = (await pool.query(sql, [id])).rows[0].last_loan_amount;
    let loanStatus = allLoanStatus.filter((allLoanStatus: any) => allLoanStatus.productId == productId);
    let noOfLoan;

    if (loanStatus[0]) {
      loanStatus = loanStatus.map((value: any) => value.noOfLoan);
      const maxLoanNo = Math.max(...loanStatus);
      noOfLoan = maxLoanNo;
    } else noOfLoan = 0;

    const loanNo = noOfLoan + 1;
    const lastLoan = allLoanStatus.last_loan_amount;

    let sqlMax;
    sqlMax = `SELECT max_amount FROM loan.product_sanction_policy where project_id = $1 AND loan_no = $2 AND product_id = $3`;
    const resultMax = (await pool.query(sqlMax, [projectId, loanNo, productId])).rows[0]?.max_amount;

    if (!resultMax) throw new BadRequestError(`পরবর্তী সর্বোচ্চ ঋণের পরিমান (টাকা) পাওয়া যায়নি`);
    return {
      lastNoOfLoan: noOfLoan,
      lastLoanAmount: lastLoan,
      currentLoanNo: loanNo,
      nextMaxLoanAmount: resultMax ? Number(resultMax) : 0,
    };
  }

  //get DocumentType
  async getDocumentType(doptorId: number, projectId: number, productId: number, customerId: number) {
    const pool = db.getConnection("slave");
    const customerDocSql = `SELECT document_data FROM loan.document_info WHERE ref_no = $1`;
    let customerDoc = (await pool.query(customerDocSql, [customerId])).rows[0].document_data;
    const getDocTypeIdSql = `SELECT id FROM master.document_type WHERE doc_type = $1`;
    if (customerDoc.member_picture) {
      const documentTypeId = (await pool.query(getDocTypeIdSql, ["IMG"])).rows[0]?.id;
      customerDoc?.own.push({ documentTypeId });
    }
    if (customerDoc.member_sign) {
      const documentTypeId = (await pool.query(getDocTypeIdSql, ["SIN"])).rows[0]?.id;
      customerDoc?.own.push({ documentTypeId });
    }
    customerDoc = customerDoc?.own ? toCamelKeys(customerDoc.own) : {};
    const customerDocsId = customerDoc.map((value: any) => value.documentTypeId);

    const sql = `SELECT 
                  a.id, 
                  a.doc_type,
                  a.doc_type_desc,
                  b.is_mandatory,
                  a.document_properties :: json -> 'doc_no_length' doc_no_length,
                  a.document_properties :: json -> 'is_doc_no_mandatory' is_doc_no_mandatory
                FROM 
                  master.document_type a
                  INNER JOIN loan.product_document_mapping b ON a.id = b.doc_type_id
                WHERE     
                  b.doptor_id = $1
                  AND b.project_id = $2
                  AND b.product_id = $3
                  AND b.is_active = TRUE
                  AND a.is_active = TRUE`;
    const result = (await pool.query(sql, [doptorId, projectId, productId])).rows;

    let finalDocs = [];
    for (let [index, singleDoc] of result.entries()) {
      if (!customerDocsId.includes(singleDoc.id)) finalDocs.push(singleDoc);
      else continue;
    }
    return finalDocs[0] ? toCamelKeys(finalDocs) : [];
  }

  //get Given document
  async getGivenDoc(doptorId: number, projectId: number, productId: number, customerId: number) {
    const pool = db.getConnection("slave");
    const customerDocSql = `SELECT document_data FROM loan.document_info WHERE ref_no = $1`;
    let customerDoc = (await pool.query(customerDocSql, [customerId])).rows[0].document_data;
    if (customerDoc?.member_picture) customerDoc["own"].push({ documentTypeId: 1 });
    if (customerDoc?.member_sign) customerDoc["own"].push({ documentTypeId: 2 });

    const docTypeDescSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;
    customerDoc = customerDoc?.own ? toCamelKeys(customerDoc.own) : [];

    const customerDocsId = customerDoc.map((value: any) => value.documentTypeId);

    const sql = `SELECT 
                  a.id, 
                  a.doc_type,
                  a.doc_type_desc
                FROM 
                  master.document_type a
                  INNER JOIN loan.product_document_mapping b ON a.id = b.doc_type_id
                WHERE     
                  b.doptor_id = $1
                  AND b.project_id = $2
                  AND b.product_id = $3
                  AND b.is_active = TRUE
                  AND a.is_active = TRUE`;

    let result = (await pool.query(sql, [doptorId, projectId, productId])).rows;

    let finalInfo = [];

    for (let mappingDoc of result) {
      if (customerDocsId.includes(mappingDoc.id)) {
        let docTypeDesc = (await pool.query(docTypeDescSql, [mappingDoc.id])).rows[0];
        finalInfo.push({
          id: mappingDoc.id,
          docType: mappingDoc.documentType,
          docTypeDesc: docTypeDesc.doc_type_desc,
          isSubmit: true,
        });
      } else {
        finalInfo.push({ ...mappingDoc, isSubmit: false });
      }
    }

    return finalInfo.length > 0 ? toCamelKeys(finalInfo) : [];
  }

  async sanctionApproval(
    samityId: number,
    data: any,
    transaction: PoolClient,
    userId: number,
    doptorId: number,
    projectId: number,
    applicationId: number,
    officeId: number
  ) {
    const camelCaseData = toCamelKeys(data) as any;

    var resGlobalLimit;

    const { sql, params } = buildInsertSql("loan.global_limit", {
      doptorId: Number(doptorId),
      officeId,
      projectId: Number(projectId),
      applicationId: Number(applicationId),
      samityId: Number(samityId),
      //accountId: update during disbursement,
      sanctionId: Math.random().toString().substring(2, 12),
      sanctionLimit: Number(camelCaseData.loanAmount),
      sanctionBy: Number(userId),
      sanctionDate: new Date(),
      serviceChargeRate: Number(camelCaseData.interestRate),
      profitAmount: Number(camelCaseData.serviceCharge),
      installmentNo: Number(camelCaseData.installmentNumber),
      loanFrequency: "M",
      installmentFrequency: camelCaseData.frequency,
      purposeId: camelCaseData.loanPurpose,
      ...lodash.omit(camelCaseData, [
        "deskId",
        "docInfo",
        "projectId",
        "frequency",
        "applyDate",
        "loanAmount",
        "grantorInfo",
        "loanPurpose",
        "installmentNumber",
        "serviceCharge",
        "interestRate",
        "documentList",
        "userId",
        "userType",
        "samityName",
        "customerName",
      ]),
      authorizeStatus: "A",
      authorizedBy: Number(userId),
      authorizedAt: new Date(),
      isDisbursed: false,
      createdBy: Number(userId),
      createdAt: new Date(),
      disbursementLog: [],
      disbursedAmount: 0,
    });

    resGlobalLimit = await (await transaction.query(sql, params)).rows[0];

    for (const grantor of camelCaseData.grantorInfo) {
      const { sql, params } = buildInsertSql("loan.guarantor_info", {
        guarantorName: grantor.grantorName,
        fatherName: grantor.fatherName,
        motherName: grantor.motherName,
        mobile: grantor.mobile,
        nid: grantor.nidNumber,
        dob: new Date(grantor.birthDate).toLocaleDateString("en-GB"),
        occupationId: grantor.occupation ? grantor.occupation : 0,
        relationId: grantor.relation ? grantor.relation : 0,
        presentAddress: grantor.preAddress,
        permanentAddress: grantor.perAddress,
        sanctionId: resGlobalLimit.sanction_id,
        isActive: true,
        guarantorType:
          grantor.grantorOrWitness && grantor.grantorOrWitness === "J"
            ? "G"
            : grantor.grantorOrWitness === "W"
            ? "W"
            : null,
        isCustomer: grantor.personType && grantor.personType === "M" ? true : grantor.personType === "N" ? false : null,
        customerId: grantor.personName ? grantor.personName : 0,
        createdBy: userId,
        createdAt: new Date(),
      });
      await transaction.query(sql, params);
    }
    const memberDocsSql = `SELECT document_data FROM loan.document_info WHERE ref_no = $1`;
    let memberDocs = (await transaction.query(memberDocsSql, [camelCaseData.customerId])).rows[0].document_data;
    memberDocs = memberDocs ? toCamelKeys(memberDocs) : {};

    if (memberDocs?.sanction && memberDocs?.sanction[0]) memberDocs.sanction = [...memberDocs.sanction];
    else memberDocs.sanction = [];

    for (const value of camelCaseData.documentList) {
      memberDocs.sanction.push({ applicationId, documents: [value] });
    }
    const { sql: memberDocumentsUpdateSql, params: memberDocumentsUpdateParams } = buildUpdateWithWhereSql(
      "loan.document_info",
      { refNo: camelCaseData.customerId },
      { documentData: memberDocs }
    );
    await transaction.query(memberDocumentsUpdateSql, memberDocumentsUpdateParams);
    return resGlobalLimit;
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
