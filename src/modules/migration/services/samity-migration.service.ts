/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-11-15 09:59:35
 * @modify date 2022-11-15 09:59:35
 * @desc [description]
 */

import { toCamelKeys, toSnakeCase } from "keys-transform";
import { default as _, isArray, default as lodash } from "lodash";
import moment from "moment";
import { PoolClient } from "pg";
import {
  BadRequestError,
  buildGetSql,
  buildInsertSql,
  buildSql,
  buildUpdateSql,
  buildUpdateWithWhereSql,
} from "rdcd-common";
import { Container, Service } from "typedi";
import { getComponentId } from "../../../configs/app.config";
import db from "../../../db/connection.db";
import ServiceChargeService from "../../../modules/transaction/services/service-charge.service";
import TransactionService from "../../../modules/transaction/services/transaction.service";
import { ApplicationServices } from "../../application//services/application.service";
import SamityService from "../../samity/services/samity.service";
import { ITransactionAttrs } from "../../transaction/interfaces/transaction.interface";
import { DayOpenCloseService } from "../../transaction/services/day-open-close.service";
import { OfficeInfoServices } from "./../../master/services/office-info.service";
import { SamityMigrationInput, SamityMigrationMemberInput } from "./../interfaces/samity-migration.interface";
@Service()
export class SamityMigrationService {
  #samityDefaultValue = {
    memberMinAge: 18,
    memberMaxAge: 65,
    samityMinMember: 1,
    samityMaxMember: 99,
    groupMinMember: 1,
    groupMaxMember: 5,
    coopStatus: false,
    isSme: false,
    flag: 5,
    members: [],
  };
  constructor() {}

  async getByOffice(officeId: number, approveStatus?: string) {
    const connection = db.getConnection("slave");

    let sql: any;

    if (approveStatus == undefined) {
      sql = buildGetSql(["*"], "temps.migration_staging_area", {
        officeId,
        approveStatus: "P",
      });
    } else {
      sql = {
        queryText: `SELECT * FROM temps.migration_staging_area
          where json_array_length((data->'members')::json) > 0
          and office_id = $1 and approve_status = $2
          ;`,
        values: [officeId, approveStatus],
      };
    }

    const { rows: samity } = await connection.query(sql.queryText, sql.values);

    return toCamelKeys(samity);
  }

  async checkIsMemberHaveLoanAlready(customerOldCode: string, samityId: Number) {
    const connection = db.getConnection("slave");
    const checkMemberLoanSql = `select 
    count(c.id) as member_loan_info
    from samity.customer_info a 
    inner join loan.account_info b on a.id=b.customer_id
    inner join loan.product_mst c on b.product_id=c.id
    where a.customer_old_code = $1 and c.deposit_nature ='L' and b.samity_id = $2 `;
    const queryResult = await (await connection.query(checkMemberLoanSql, [customerOldCode, samityId])).rows[0];
    if (queryResult.member_loan_info > 0) {
      return false;
    } else {
      return true;
    }
  }

  async getById(id: number) {
    const connection = db.getConnection("slave");

    const sql = buildGetSql(["*"], "temps.migration_staging_area", {
      id,
    });

    const {
      rows: [samity],
    } = await connection.query(sql.queryText, sql.values);

    return samity ? (toCamelKeys(samity) as any) : [];
  }
  async getByIdFromApplicationTable(id: number) {
    const connection = db.getConnection("slave");

    const sql = buildGetSql(["*"], "temps.application", {
      id,
    });

    const {
      rows: [samity],
    } = await connection.query(sql.queryText, sql.values);

    return samity ? (toCamelKeys(samity) as any) : [];
  }

  async store(samity: SamityMigrationInput[], createdBy: any) {
    const connection = db.getConnection("master");
    const officeInfoService = Container.get(OfficeInfoServices);
    const formattedSamity = samity.map(async (s) => {
      const officeInfo = await officeInfoService.getById(s.officeId);
      return {
        ...s,
        ...this.#samityDefaultValue,
        districtId: s?.districtId || officeInfo.districtId,
      };
    });

    for await (const s of formattedSamity) {
      const sql = buildInsertSql("temps.migration_staging_area", {
        data: s,
        projectId: s.projectId,
        officeId: s.officeId,
        createdAt: new Date(),
        createdBy,
      });

      await connection.query(sql.sql, sql.params);
    }

    return true;
  }

  async samityDuplicateCheck(samityCode: string, officeId: number, projectId: number, updateSamityId?: string) {
    const connection = db.getConnection("master");
    const sql = updateSamityId
      ? `select id from temps.migration_staging_area where id != $1 and (data->>'samity_old_code')::text = $2;`
      : `select id from temps.migration_staging_area where (data->>'samity_old_code')::text = $1 and project_id = $2 and office_id = $3;`;
    const params = updateSamityId ? [updateSamityId, samityCode] : [samityCode, projectId, officeId];

    const { rowCount } = await connection.query(sql, params);
    return rowCount != 0;
  }

  async memberDuplicateCheck(samityId: number, value: string, updateMemberCode?: any) {
    const connection = db.getConnection("master");
    let members = [];

    const sql = `select data->'members' as members from temps.migration_staging_area where id = $1;`;
    const params = [samityId];

    const { members: data } = await (await connection.query(sql, params)).rows[0];

    members = updateMemberCode
      ? data.filter(
          (d: { customer_old_code: string; nid: string; brn: string }) => d.customer_old_code != updateMemberCode
        )
      : data;

    const member = members.find(
      (m: { customer_old_code: string; nid: string; brn: string }) =>
        m.customer_old_code == value || m.nid == value || m.brn == value
    );

    return member ? true : false;
  }
  async updateLoanInfo(applicationId: number, updatedData: any, pool: any) {
    // const readConnection = db.getConnection("slave");
    // const writeConnection = db.getConnection("master");
    const applicationSql = `select data from temps.application where id = $1`;
    const applicationData = (await pool.query(applicationSql, [applicationId])).rows[0]?.data;

    const foundIndex = applicationData.findIndex((app: any) => {
      return app.loanInfo.customerOldCode == updatedData.customerOldCode;
    });

    applicationData[foundIndex] = {
      loanInfo: lodash.omit(updatedData, [
        "memberNameBangla",
        "serviceId",
        "serviceName",
        "updatedBy",
        "updatedAt",
        "doptorId",
      ]),
      scheduleInfo: applicationData[foundIndex].scheduleInfo,
    };
    try {
      const { sql, params } = buildUpdateSql(
        "temps.application",
        applicationId,
        { data: JSON.stringify(applicationData), updatedAt: updatedData.updatedAt, updatedBy: updatedData.updatedBy },
        "id"
      );

      const updateId = await (await pool.query(sql, params)).rows[0];

      return { id: updateId };
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  async updateById(samityId: number, updatedData: SamityMigrationInput, updatedBy: any) {
    const connection = db.getConnection("master");

    const samity = await this.getById(samityId);
    const members = samity.data.members;

    const updatedSamity = {
      ...samity.data,
      updatedAt: new Date(),
      updatedBy,
      ...updatedData,
      members,
    };

    const sql = buildUpdateSql(
      "temps.migration_staging_area",
      samityId,
      {
        data: updatedSamity,
      },
      "id"
    );

    await connection.query(sql.sql, sql.params);

    return true;
  }

  async updateMemberBySamityId(samityId: number, updatedMembers: SamityMigrationMemberInput[], updatedBy: any) {
    const connection = db.getConnection("master");

    const { data } = await this.getById(samityId);
    const members = data.members as SamityMigrationMemberInput[];

    updatedMembers.map((m) => {
      const member = members.find((sm) => sm.customerOldCode == m.customerOldCode);
      if (member) {
        const memberIndex = members.findIndex((sm) => sm.customerOldCode == m.customerOldCode);

        members[memberIndex] = { ...member, ...m };
      }
    });

    data.members = members;

    const sql = buildUpdateSql(
      "temps.migration_staging_area",
      samityId,
      {
        data,
        updatedBy,
        updatedAt: new Date(),
      },
      "id"
    );

    await connection.query(sql.sql, sql.params);

    return true;
  }

  async createMemberAccount(
    transaction: PoolClient,
    doptorId: number,
    officeId: number,
    projectId: number,
    samityId: number,
    customerId: number,
    savingsAccountNo: number,
    shareAccountNo: number,
    accountTitle: string,
    depositProductId: number,
    shareProductId: number,
    createdBy: any
  ) {
    const samityService = Container.get(SamityService);
    let resMemSavingsAccount: any;
    let resMemShareAccount: any;
    try {
      if (depositProductId) {
        const { sql: memberSavingsAccountSql, params: memberSavingsAccountParams } = buildInsertSql(
          "loan.account_info",
          {
            samityId: samityId,
            customerId: customerId,
            doptorId: doptorId,
            projectId: projectId,
            officeId: officeId,
            productId: depositProductId,
            accountNo: savingsAccountNo,
            accountTitle: accountTitle,
            openDate: new Date(),
            withdrawInstruction: "T",
            accountStatus: "ACT",
            alltrn: "B",
            authorizeStatus: "P",
            createdBy,
            createdAt: new Date(),
          }
        );

        resMemSavingsAccount = (await transaction.query(memberSavingsAccountSql, memberSavingsAccountParams)).rows[0];
        const { sql: savingsAccountBalSql, params: savingsAccountBalParams } = buildInsertSql("loan.account_balance", {
          doptorId: doptorId,
          projectId: projectId,
          officeId: officeId,
          productId: depositProductId,
          accountId: resMemSavingsAccount.id,
          currentBalance: 0,
          blockAmt: 0,
          createdBy,
          createdAt: new Date(),
        });
        const memberAccount = await transaction.query(savingsAccountBalSql, savingsAccountBalParams);
      }

      if (shareProductId) {
        const { sql: memberShareAccountSql, params: memberShareAccountParams } = buildInsertSql("loan.account_info", {
          samityId: samityId,
          customerId: customerId,
          doptorId: doptorId,
          projectId: projectId,
          officeId: officeId,
          productId: shareProductId,
          accountNo: shareAccountNo,
          accountTitle: accountTitle,
          withdrawInstruction: "T",
          openDate: new Date(),
          accountStatus: "ACT",
          alltrn: "B",
          authorizeStatus: "P",
          createdBy,
          createdAt: new Date(),
        });

        resMemShareAccount = (await transaction.query(memberShareAccountSql, memberShareAccountParams)).rows[0];
        const { sql: shareAccountBalSql, params: shareAccountBalParams } = buildInsertSql("loan.account_balance", {
          doptorId: doptorId,
          projectId: projectId,
          officeId: officeId,
          productId: shareProductId,
          accountId: resMemShareAccount.id,
          currentBalance: 0,
          blockAmt: 0,
          createdBy,
          createdAt: new Date(),
        });
        await transaction.query(shareAccountBalSql, shareAccountBalParams);
      }

      return {
        depositAccountId: resMemSavingsAccount?.id,
        shareAccountId: resMemShareAccount?.id,
      };
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async generalTransactionEngine(
    doptorId: number,
    officeId: number,
    projectId: number,
    userId: number,
    productDepositNature: "L" | "R" | "S" | null,
    transactionSets: ITransactionAttrs[],
    transaction: PoolClient
  ) {
    // Party account active?
    // If debit transaction then check party account have enough balance
    // Gl negative balance checking
    //const pool = db.getConnection("slave");

    // for (const element of transactionSets) {
    //   const checkResult = await this.checkIsGlBalanceNegative(
    //     Number(element.glacId),
    //     element.drcrCode,
    //     Number(element.tranAmt),
    //     officeId,
    //     transaction,
    //     projectId ? projectId : undefined
    //   );
    //   if (!checkResult?.status) {
    //     throw new BadRequestError(checkResult?.message);
    //   }
    // }

    const allDebitTransaction = transactionSets.filter(
      (value: any) => value.drcrCode == "D" && value.tranCode != "IND"
    );
    const allCreditTransaction = transactionSets.filter((value: any) => value.drcrCode == "C");

    const allDebitAmounts = allDebitTransaction.map((value: any) => value.tranAmt);
    const allCreditAmounts = allCreditTransaction.map((value: any) => value.tranAmt);

    const allDebitAmountsTotal = allDebitAmounts.reduce((sum: number, number: number) => sum + number, 0);
    const allCreditAmountsTotal = allCreditAmounts.reduce((sum: number, number: number) => sum + number, 0);

    // if (allDebitAmountsTotal != allCreditAmountsTotal) throw new BadRequestError(`ডেবিট ও ক্রেডিটের পরিমাণ সমান নেই`);

    const dayOpenCloseService: DayOpenCloseService = Container.get(DayOpenCloseService);
    const transactionDate = await dayOpenCloseService.getOpenDate(
      undefined,
      doptorId,
      officeId,
      projectId,
      transaction
    );

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

    for (const singleSet of transactionSets) {
      if (singleSet.accountId) {
        let accountInfo = (await transaction.query(balanceCheckSql, [singleSet.accountId])).rows[0];

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
          throw new BadRequestError(`ডেবিট একাউন্টে পর্যাপ্ত টাকা নেই`);
        }
      }

      let { sql, params } = buildInsertSql("loan.transaction_daily", {
        doptorId,
        officeId,
        ...singleSet,
        tranDate: transactionDate.openCloseDate,
        valDate: new Date(),
        authorizeStatus: "A",
        createdBy: userId,
        createdAt: new Date(),
      });

      let result = await (await transaction.query(sql, params)).rows[0];
      allResults.push(result);
    }
    return allResults.length > 0 ? toCamelKeys(allResults) : [];
  }
  async makeSavingsDeposit(
    data: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    batchNumber: string,
    createdBy: number,
    client: PoolClient
  ) {
    const transactionService = Container.get(TransactionService);
    // const pool = db.getConnection("slave");
    try {
      const productSql = `SELECT product_gl, deposit_nature FROM loan.product_mst WHERE id = $1`;
      const productInfo = (await client.query(productSql, [data.productId])).rows[0];

      const tranNum = await transactionService.generateTransactionNumber(client);
      const transactionSets = [
        {
          projectId,
          productId: data.productId,
          accountId: data.accountId,
          naration: "Deposit transaction to member savings account",
          drcrCode: "C",
          tranNum,
          glacId: null,
          tranAmt: data.tranAmt,
          batchNum: batchNumber,
          tranCode: "DEP",
          tranType: "CASH",
        },
      ];
      let transactionData;
      if (data.tranAmt > 0) {
        transactionData = await this.generalTransactionEngine(
          doptorId,
          officeId,
          projectId,
          createdBy,
          productInfo.deposit_nature,
          transactionSets,
          client
        );
      }

      let total = parseInt(data.tranAmt);
      if (!total) {
        if (total != 0) {
          throw new BadRequestError("total not found");
        }
      }

      // const { sql: accountBalanceSql, params: accountBalanceParams } = buildUpdateWithWhereSql(
      //   "loan.account_balance",
      //   { accountId: data.accountId },
      //   {
      //     doptorId,
      //     projectId,
      //     officeId,
      //     productId: data.productId,
      //     accountId: data.accountId,
      //     currentBalance: total,
      //     updatedBy: createdBy,
      //     updatedAt: new Date(),
      //   }
      // );

      // const accBalanceRes = (await client.query(accountBalanceSql, accountBalanceParams)).rows[0];

      return transactionData;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async makeShareDeposit(
    data: any,
    doptorId: number,
    officeId: number,
    projectId: number,
    batchNumber: string,
    createdBy: number,
    client: PoolClient
  ) {
    const transactionService = Container.get(TransactionService);
    try {
      const productSql = `SELECT product_gl, deposit_nature FROM loan.product_mst WHERE id = $1`;
      const productInfo = (await client.query(productSql, [data.productId])).rows[0];

      const tranNum = await transactionService.generateTransactionNumber(client);
      const transactionSets = [
        {
          projectId,
          productId: data.productId,
          accountId: data.accountId,
          naration: "Share transaction to member share account",
          drcrCode: "C",
          tranNum,
          glacId: null,
          tranAmt: data.tranAmt,
          batchNum: batchNumber,
          tranCode: "SHR",
          tranType: "CASH",
        },
      ];
      let transactionData;
      if (data.tranAmt > 0) {
        transactionData = await this.generalTransactionEngine(
          doptorId,
          officeId,
          projectId,
          createdBy,
          productInfo.deposit_nature,
          transactionSets,
          client
        );
      }

      let total = parseInt(data.tranAmt);
      if (!total) {
        if (total != 0) {
          throw new BadRequestError("total not found");
        }
      }

      // const { sql: accountBalanceSql, params: accountBalanceParams } = buildUpdateWithWhereSql(
      //   "loan.account_balance",
      //   { accountId: data.accountId },
      //   {
      //     doptorId,
      //     projectId,
      //     officeId,
      //     productId: data.productId,
      //     accountId: data.accountId,
      //     currentBalance: total,
      //     updatedBy: createdBy,
      //     updatedAt: new Date(),
      //   }
      // );

      // const accBalanceRes = (await client.query(accountBalanceSql, accountBalanceParams)).rows[0];

      return transactionData;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getProjectIdFromMigrationStaginArea(samityId: number) {
    const transaction = await db.getConnection("slave");
    const dataSql = `select data from temps.migration_staging_area where id = $1`;
    const result = (await transaction.query(dataSql, [samityId])).rows[0];

    const { project_id } = result.data;

    return project_id;
  }
  async samityApprove(samityId: number, approveStatus: string, createdBy: string) {
    const transaction = await db.getConnection("master").connect();
    const transactionService = Container.get(TransactionService);
    try {
      transaction.query("BEGIN");

      if (approveStatus == "A") {
        const samitySql = buildGetSql(["*"], "temps.migration_staging_area", {
          id: samityId,
        });

        const {
          rows: [samity],
        } = await transaction.query(samitySql.queryText, samitySql.values);

        const {
          id,
          members,
          doptor_id,
          office_id,
          district_id,
          project_id,
          upazila_id,
          union,
          updated_at,
          updated_by,
          ...samityData
        } = samity.data;

        if (samityData?.samity_member_type) {
          samityData.samity_member_type = (
            await transaction.query("SELECT id FROM master.code_master WHERE display_value = $1", [
              samityData.samity_member_type,
            ])
          ).rows[0]?.id;
        }

        const getUpaCityTypeSql = `SELECT upa_city_type FROM master.mv_upazila_city_info WHERE upa_city_id = $1`;
        const upaCityType = (await transaction.query(getUpaCityTypeSql, [upazila_id])).rows[0]?.upa_city_type;
        const allSamityInfo = {
          projectId: project_id,
          data: {
            basic: {
              districtId: district_id,
              upaCityId: upazila_id,
              upaCityType,
            },
          },
        };

        const samityService = Container.get(SamityService);
        const samityCode = await samityService.generateSamityCode(doptor_id, office_id, allSamityInfo, transaction);

        const samityInsertSql = buildInsertSql(
          "samity.samity_info",
          project_id == 13
            ? _.omit(
                {
                  ...samityData,
                  samityCode,
                  officeId: office_id,
                  doptorId: doptor_id,
                  districtId: district_id,
                  projectId: project_id,
                  createdBy,
                  createdAt: new Date(),
                  uniThanaPawId: union,
                  uniThanaPawType: "UNI",
                  upaCityId: upazila_id,
                  upaCityType: "UPA",
                  isMigrated: true,
                  authorizeStatus: "A",
                  authorizedBy: createdBy,
                  authorizedAt: new Date(),
                },
                "school_code",
                "school_name",
                "school_address"
              )
            : {
                ...samityData,
                samityCode,
                officeId: office_id,
                doptorId: doptor_id,
                districtId: district_id,
                projectId: project_id,
                isMigrated: true,
                createdBy,
                createdAt: new Date(),
                uniThanaPawId: union,
                uniThanaPawType: "UNI",
                upaCityId: upazila_id,
                upaCityType: "UPA",
                authorizeStatus: "A",
                authorizedBy: createdBy,
                authorizedAt: new Date(),
              }
        );
        const {
          rows: [approvedSamity],
        } = await transaction.query(samityInsertSql.sql, samityInsertSql.params);

        if (project_id == 13) {
          const institutionInfo = {
            instituteName: samityData.school_name,
            instituteAddress: samityData.school_address,
            instituteCode: samityData.school_code,
            samityId: approvedSamity.id,
            createdBy,
            createdAt: new Date(),
          };

          const instituteInsertSql = buildInsertSql("samity.institution_info", institutionInfo);

          const {
            rows: [approvedInstitution],
          } = await transaction.query(instituteInsertSql.sql, instituteInsertSql.params);
        }
        // throw new BadRequestError("stop in 588 samity-migaration.service");
        //get nid id from DB
        const nidSql = buildGetSql(["id"], "master.document_type", {
          docType: "NID",
        });

        const {
          rows: [{ id: nidId }],
        } = await transaction.query(nidSql.queryText, nidSql.values);

        //get brn id from DB
        const brnSql = buildGetSql(["id"], "master.document_type", {
          docType: "BRN",
        });

        const {
          rows: [{ id: brnId }],
        } = await transaction.query(brnSql.queryText, brnSql.values);

        //if samity is saved insert each customer
        if (approvedSamity) {
          for await (const {
            brn,
            nid,
            deposit_product,
            share_product,
            current_share_balance,
            current_deposit_balance,
            ...member
          } of members) {
            const customerCode = await samityService.generateMemberCode(approvedSamity.id, transaction);
            if (project_id && project_id == 13) {
              member["classId"] = member["class"];
              delete member["class"];
              member["section"] = member["section_name"];
              delete member["section_name"];
            }

            const memberSql = buildInsertSql("samity.customer_info", {
              ...(project_id && project_id != 13
                ? {
                    ..._.omit(
                      member,
                      "share_product",
                      "last_education",
                      "deposit_product",
                      "present_address",
                      "permanent_address"
                    ),
                    doptorId: doptor_id,
                    officeId: office_id,
                    projectId: project_id,
                    customerStatus: "ACT",
                    LastLoanAmount: JSON.stringify([]),
                  }
                : {
                    ..._.omit(
                      member,
                      "fathers_nid_number",
                      "mothers_nid_number",
                      "legal_guardian_nid",
                      "legal_guardian_name",
                      "relationship_with_legal_guardian",
                      "legal_guardian_occupation",
                      "share_product",
                      "present_address",
                      "permanent_address"
                    ),
                    doptorId: doptor_id,
                    officeId: office_id,
                    projectId: project_id,
                    customerStatus: "ACT",
                    LastLoanAmount: JSON.stringify([]),
                  }),

              samityId: approvedSamity.id,
              customerCode,
              createdBy,
              createdAt: new Date(),
            });
            // transaction.query("ROLLBACK");
            // console.log("memberSqlMemberParams701", memberSql.sql, memberSql.params);
            // throw new BadRequestError("Bug Fixing of member Project and office on going");

            const {
              rows: [approvedCustomer],
            } = await transaction.query(memberSql.sql, memberSql.params);

            //if customer is saved successfully insert documents in document table
            if (approvedCustomer) {
              const own: Array<object> = [];

              if (nid) {
                own.push({
                  document_type_id: nidId,
                  document_type: "NID",
                  document_number: nid,
                  document_front: "",
                  document_back: "",
                  status: true,
                });
              }

              if (brn) {
                own.push({
                  document_type_id: brnId,
                  document_type: "BRN",
                  document_number: brn,
                  document_front: "",
                  document_back: "",
                  status: true,
                });
              }

              const documentSql = buildInsertSql("loan.document_info", {
                doptorId: doptor_id,
                officeId: office_id,
                projectId: project_id,
                refNo: approvedCustomer.id,
                createdBy,
                createdAt: new Date(),
                isActive: true,
                documentData: {
                  own,
                  ...(project_id &&
                    project_id == 13 && {
                      father: {
                        document_no: member.fathers_nid_number,
                        document_type_id: nidId,
                        document_type: "NID",
                        status: true,
                      },
                      mother: {
                        document_no: member.mothers_nid_number,
                        document_type_id: nidId,
                        document_type: "NID",
                        status: true,
                      },
                      guardian: {
                        document_no: member.legal_guardian_nid,
                        document_type_id: nidId,
                        document_type: "NID",
                        status: true,
                      },
                    }),
                },
              });

              await transaction.query(documentSql.sql, documentSql.params);

              if (project_id && project_id == 13) {
                const { sql: memberGuardianSql, params: memberGuardianParams } = buildInsertSql(
                  "samity.guardian_info",
                  {
                    guardianName: member.legal_guardian_name,
                    occupation: member.legal_guardian_occupation,
                    relation: member.relationship_with_legal_guardian,
                    refNo: approvedCustomer.id,
                    isActive: true,
                    createdBy,
                    createdAt: new Date(),
                  }
                );
                await transaction.query(memberGuardianSql, memberGuardianParams);
              }
            }
            const accountPrefixSql = `SELECT account_prefix FROM loan.product_mst WHERE id = $1`;
            let savingsAccountPrefix;
            let shareAccountPrefix;
            if (deposit_product) {
              savingsAccountPrefix = (await transaction.query(accountPrefixSql, [deposit_product])).rows[0]
                ?.account_prefix;
              if (!savingsAccountPrefix) throw new BadRequestError(`সেভিংস প্রোডাক্টে অ্যাকাউন্ট প্রিফিক্স উল্লেখ নেই`);
            }
            if (share_product) {
              shareAccountPrefix = (await transaction.query(accountPrefixSql, [share_product])).rows[0]?.account_prefix;
              if (!shareAccountPrefix) throw new BadRequestError(`শেয়ার প্রোডাক্টে অ্যাকাউন্ট প্রিফিক্স উল্লেখ নেই`);
            }
            const memberAccountId = await this.createMemberAccount(
              transaction,
              doptor_id,
              office_id,
              project_id,
              approvedSamity.id,
              approvedCustomer.id,
              approvedCustomer.customer_code + savingsAccountPrefix ? savingsAccountPrefix : "01",
              approvedCustomer.customer_code + shareAccountPrefix ? shareAccountPrefix : "02",
              approvedCustomer.name_bn,
              deposit_product,
              share_product,
              createdBy
            );

            const batchNum = await transactionService.generateBatchNumber(transaction);

            if (deposit_product) {
              await this.makeSavingsDeposit(
                {
                  productId: deposit_product,
                  accountId: memberAccountId.depositAccountId,
                  tranAmt: current_deposit_balance,
                },
                doptor_id,
                office_id,
                project_id,
                batchNum,
                Number(createdBy),
                transaction
              );
            }

            if (share_product) {
              await this.makeShareDeposit(
                {
                  productId: share_product,
                  accountId: memberAccountId.shareAccountId,
                  tranAmt: current_share_balance,
                },
                doptor_id,
                office_id,
                project_id,
                batchNum,
                Number(createdBy),
                transaction
              );
            }
          }
        }
      }

      const updateTempSamitySql = buildUpdateWithWhereSql(
        "temps.migration_staging_area",
        {
          id: samityId,
        },
        { approveStatus }
      );

      await transaction.query(updateTempSamitySql.sql, updateTempSamitySql.params);

      transaction.query("COMMIT");

      return true;
    } catch (error: any) {
      transaction.query("ROLLBACK");
      console.log("migration error", error);
      throw new BadRequestError(error);
    } finally {
      transaction.release();
    }
  }

  async storeMembers(samityId: number, members: SamityMigrationMemberInput[]) {
    if (members.length == 0) return true;
    const connection = db.getConnection("master");
    const { data } = await this.getById(samityId);
    let newMembers: SamityMigrationMemberInput[] = [];

    if (data && data.members) {
      if (data.members.length > 0) {
        members.map((m: SamityMigrationMemberInput) => {
          const oldMember = data.members.find((member: any) => member.customerOldCode == m.customerOldCode);

          oldMember ? newMembers.push({ ...oldMember, ...m }) : newMembers.push(m);
        });
      } else {
        newMembers = members;
      }
    }

    data.members = newMembers;

    const sql = buildUpdateWithWhereSql(
      "temps.migration_staging_area",
      {
        id: samityId,
      },
      { data }
    );

    await connection.query(sql.sql, sql.params);

    return true;
  }

  async generateLoanScheduleForAMember(allData: any, officeId: number) {
    const samityService = Container.get(SamityService);
    const samityInfo = await samityService.getSingleSamity(1, officeId);

    if (!samityInfo[0]?.meetingDay) {
      throw new BadRequestError("বৈঠকের দিন পাওয়া যায়নি");
    }
    if (!samityInfo[0]?.weekPosition) {
      throw new BadRequestError("সপ্তাহের অবস্থান পাওয়া যায়নি");
    }
    const [meetingDay, weekPosition] = samityInfo;

    const transaction = db.getConnection("slave");
    // const samityService: SamityService = Container.get(SamityService);
    const camelCaseData = toCamelKeys(allData) as any;

    const productSql = `SELECT 
    a.doptor_id,
     a.cal_type, 
     a.product_gl, 
     a.grace_amt_repay_ins, 
     a.grace_period,
     a.holiday_effect,
     a.installment_amount_method,
     a.installment_division_digit,
	 b.int_rate
  FROM 
    loan.product_mst a inner join loan.product_interest b on a.id =b.product_id
  WHERE 
    a.id = $1`;

    const productInfo = (await transaction.query(productSql, [camelCaseData.productId])).rows[0];

    const serviceCharge = Container.get(ServiceChargeService);

    // throw new BadRequestError("stop");
    const data = await serviceCharge.get(
      Number(allData.disbursementAmount),
      Number(allData.loanTermMonth),
      Number(productInfo.int_rate),
      productInfo.cal_type,
      Number(allData.noOfInstallment),
      allData.repaymentFrequency,
      moment(allData.disbursementDate),
      productInfo.grace_amt_repay_ins ? productInfo.grace_amt_repay_ins : "NO",
      productInfo.grace_period,
      meetingDay,
      weekPosition,
      productInfo.doptor_id ? Number(productInfo.doptor_id) : undefined,
      officeId,
      productInfo.holiday_effect ? productInfo.holiday_effect : undefined,
      productInfo.installment_amount_method,
      productInfo?.installment_division_digit ? productInfo.installment_division_digit : undefined
    );
    let schedule;
    if (data.schedule.length > 0) {
      let currentPrincipalBalance = allData?.paidPrincipalAmount ? allData.paidPrincipalAmount : 0;
      let currentServiceChargeBalance = allData?.paidServiceChargeAmount ? allData.paidServiceChargeAmount : 0;
      schedule = data.schedule.map((singleSchedule, index) => {
        if (index != 0) {
          currentPrincipalBalance = currentPrincipalBalance - singleSchedule.installmentPrincipalAmt;
          currentServiceChargeBalance = currentServiceChargeBalance - singleSchedule.installmentServiceChargeAmt;
        }

        return {
          ...singleSchedule,
          principalPaidAmount:
            currentPrincipalBalance > 0
              ? currentPrincipalBalance < singleSchedule.installmentPrincipalAmt
                ? Number(currentPrincipalBalance).toFixed(2)
                : Number(singleSchedule.installmentPrincipalAmt).toFixed(2)
              : 0,
          interestPaidAmount:
            currentServiceChargeBalance > 0
              ? currentServiceChargeBalance < singleSchedule.installmentServiceChargeAmt
                ? Number(currentServiceChargeBalance).toFixed(2)
                : Number(singleSchedule.installmentServiceChargeAmt).toFixed(2)
              : 0,
          totalPaidAmount: (
            (currentPrincipalBalance > 0
              ? currentPrincipalBalance < singleSchedule.installmentPrincipalAmt
                ? Number(currentPrincipalBalance)
                : Number(singleSchedule.installmentPrincipalAmt)
              : 0) +
            (currentServiceChargeBalance > 0
              ? currentServiceChargeBalance < singleSchedule.installmentServiceChargeAmt
                ? Number(currentServiceChargeBalance)
                : Number(singleSchedule.installmentServiceChargeAmt)
              : 0)
          ).toFixed(2),
        };
      });
    }

    return schedule;
  }
  async getLoanInfoFromApplicationTable(projectId: Number, samityId: Number) {
    const loanInfoSql = `SELECT  JSON_AGG(
      JSON_BUILD_OBJECT(
      'noOfLoan',e->'loanInfo'->>'noOfLoan',
      'productId',e->'loanInfo'->>'productId',
      'gracePeriod',e->'loanInfo'->>'gracePeriod',
      'penalCharge',e->'loanInfo'->>'penalCharge',
      'loanTermMonth',e->'loanInfo'->>'loanTermMonth',
      'customerOldCode',e->'loanInfo'->>'customerOldCode',
      'noOfInstallment',e->'loanInfo'->>'noOfInstallment',
      'disbursementDate',e->'loanInfo'->>'disbursementDate',
      'disbursementAmount',e->'loanInfo'->>'disbursementAmount',
      'totalServiceCharge',e->'loanInfo'->>'totalServiceCharge',
      'paidPrincipalAmount',e->'loanInfo'->>'paidPrincipalAmount',
      'paidServiceChargeAmount',e->'loanInfo'->>'paidServiceChargeAmount',
      'memberNameBangla',b.name_bn
          
            ) 
          ) as loanInfo,a.status,a.id
      FROM temps.application a
      CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS(a.data) AS e 
      LEFT JOIN samity.customer_info b ON e->'loanInfo'->>'customerOldCode' = b.customer_old_code and a.samity_id =b.samity_id 
      where a.samity_id=$1 and a.project_id= $2 and a.service_id = $3 and status = 'P'
      GROUP BY a.id
    `;
    try {
      const response = await (await db.getConnection("slave").query(loanInfoSql, [projectId, samityId, 17])).rows;
      return response[0]?.loaninfo
        ? (toCamelKeys({
            loanInfo: response[0].loaninfo,
            applicationId: response[0].id,
          }) as any)
        : [];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getLoanInfoFromApplicationOfACustomer(applicationId: number, customerOldCode: number) {
    const customerLoanInfoSql = `SELECT  JSON_AGG(
  JSON_BUILD_OBJECT(
'noOfLoan',e->'loanInfo'->>'noOfLoan',
'productId',e->'loanInfo'->>'productId',
'purposeId',e->'loanInfo'->>'purposeId',
'gracePeriod',e->'loanInfo'->>'gracePeriod',
'penalCharge',e->'loanInfo'->>'penalCharge',
'loanTermMonth',e->'loanInfo'->>'loanTermMonth',
'customerOldCode',e->'loanInfo'->>'customerOldCode',
'noOfInstallment',e->'loanInfo'->>'noOfInstallment',
'disbursementDate',e->'loanInfo'->>'disbursementDate',
'disbursementAmount',e->'loanInfo'->>'disbursementAmount',
'totalServiceCharge',e->'loanInfo'->>'totalServiceCharge',
'paidPrincipalAmount',e->'loanInfo'->>'paidPrincipalAmount',
'paidServiceChargeAmount',e->'loanInfo'->>'paidServiceChargeAmount',
'memberNameBangla',b.name_bn
 
   ) 
 ) as loanInfo,a.status,a.id
FROM temps.application a
CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS(a.data) AS e 
LEFT JOIN samity.customer_info b ON e->'loanInfo'->>'customerOldCode' = b.customer_old_code and a.samity_id =b.samity_id 
where a.id = $1 and e->'loanInfo'->>'customerOldCode' = $2
GROUP BY a.id`;
    try {
      const response = await (
        await db.getConnection("slave").query(customerLoanInfoSql, [applicationId, customerOldCode])
      ).rows;
      return response[0]?.loaninfo ? (toCamelKeys(response[0].loaninfo) as any) : [];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async storeLoanInfo(payload: any) {
    const connection = db.getConnection("master");
    const loanInfoSchedules = [];

    if (payload.loanInfos.length > 0) {
      for (let loan of payload.loanInfos) {
        try {
          const schedule = await this.generateLoanScheduleForAMember(loan, payload.samityId);
          const customerCode = loan.customerOldCode;
          loanInfoSchedules.push({
            loanInfo: { ...loan },
            scheduleInfo: schedule,
          });
        } catch (error: any) {
          throw new BadRequestError(error);
        }
      }
    }
    if (payload?.data) {
      payload.data["userId"] = payload.createdBy;
      payload.data["userType"] = "user";
      payload.data["loanInfoSchedules"] = loanInfoSchedules;
    }

    const sql = buildInsertSql("temps.application", {
      doptorId: payload.doptorId,
      projectId: payload.projectId,
      samityId: payload.samityId,
      serviceId: payload.serviceId,
      nextAppDesignationId: payload.nextAppDesignationId,
      componentId: payload.componentId,
      status: "P",
      data: payload.data,
      createdBy: payload.createdBy,
      createdAt: payload.createdAt,
    });

    try {
      return await (
        await connection.query(sql.sql, sql.params)
      ).rows[0];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async leftPadding(number: any, length: any) {
    var len = length - ("" + number).length;
    return (len > 0 ? new Array(++len).join("0") : "") + number;
  }
  async checkIsMemberExistBySamityId(samityOldCode: string, samityId: number) {
    const connection = db.getConnection("slave");
    const sql = `select count(*) from samity.customer_info where customer_old_code = $1 and `;
  }
  async checkIsMemberExist(samityOldCode: string, samityId: number) {
    const connection = db.getConnection("slave");
    const sql = `select count(*) from samity.customer_info where customer_old_code = $1 and samity_id = $2`;
    const { count } = (await connection.query(sql, [samityOldCode, samityId])).rows[0];
    return count > 0 ? true : false;
  }
  async loanInfoApproveOfMembers(
    applicationId: Number,
    userId: Number,
    serviceAction: any,
    data: any,
    transaction: PoolClient
  ) {
    const transactionService = Container.get(TransactionService);
    const dayOpenCloseService: DayOpenCloseService = Container.get(DayOpenCloseService);
    const applicationService = Container.get(ApplicationServices);
    const payloadData: any = await applicationService.getLoanInfoMigrationOfMembersDe(
      Number(applicationId),
      "loanInfoMigration",
      getComponentId("loan"),
      transaction
    );

    const loanInfo = payloadData?.details?.data;
    const samityInfo = payloadData.samityInfo;
    if (!loanInfo && loanInfo.length == 0) {
      throw new BadRequestError("Loaninfo not found");
    }
    if (!samityInfo) {
      throw new BadRequestError("Samity info not found");
    }

    try {
      const batchNum = await transactionService.generateBatchNumber(transaction);
      const tranNum = await transactionService.generateTransactionNumber(transaction);
      const transactionDate = await dayOpenCloseService.getOpenDate(
        undefined,
        samityInfo.doptorId,
        samityInfo.officeId,
        samityInfo.projectId,
        transaction
      );
      if (!transactionDate?.openCloseDate) {
        throw new BadRequestError("Open date not found");
      }
      const status = false;
      for (let loanMemberScheduleInfo of loanInfo) {
        const customerSql = `	select id from samity.customer_info where customer_old_code = $1 and samity_id = $2`;
        const customerId = await (
          await transaction.query(customerSql, [loanMemberScheduleInfo.customerOldCode, samityInfo.id])
        ).rows[0];
        if (!customerId?.id) {
          throw new BadRequestError("Member not exist Please register member first");
        }

        const productInfoSql = `SELECT
                                a.rep_frq
                              FROM 
                                loan.product_mst a  
                              WHERE 
                                id = $1`;
        const productInfo = (
          await transaction.query(productInfoSql, [Number(loanMemberScheduleInfo.loaninfo.productId)])
        ).rows[0];
        const samityService: SamityService = Container.get(SamityService);
        const customerInfo = await samityService.getMainMember(1, 1, {
          id: Number(customerId.id),
        });
        let lastLoanAmount = customerInfo.data[0].lastLoanAmount ? customerInfo.data[0].lastLoanAmount : [];
        let allLoanNumbers;
        if (lastLoanAmount.length > 0) {
          lastLoanAmount = lastLoanAmount.filter(
            (value: any) => value.productId == Number(loanMemberScheduleInfo.loaninfo.productId)
          );
          allLoanNumbers = lastLoanAmount.map((value: any) => value.noOfLoan);
        } else allLoanNumbers = [0];

        const newLoanNo = Math.max(...allLoanNumbers);
        lastLoanAmount.push({
          lastLoanAmount: Number(loanMemberScheduleInfo.loaninfo.disbursementAmount),
          productId: Number(loanMemberScheduleInfo.loaninfo.productId),
          noOfLoan: Number(newLoanNo) + 1,
        });

        const { sql: cusUpdateSql, params: cusUpdateParams } = buildUpdateWithWhereSql(
          "samity.customer_info",
          { id: Number(customerId.id) },
          {
            // numberOfLoan: JSON.stringify(finalPreValue),
            lastLoanAmount: JSON.stringify(lastLoanAmount),
            updatedBy: userId,
            updatedAt: new Date(),
          }
        );
        transaction.query(cusUpdateSql, cusUpdateParams);

        const { sql, params } = buildInsertSql("loan.global_limit", {
          doptorId: Number(samityInfo.doptorId),
          officeId: Number(samityInfo.officeId),
          projectId: Number(samityInfo.projectId),
          applicationId: Number(applicationId),
          samityId: Number(samityInfo.id),
          customerId: customerId.id,
          productId: Number(loanMemberScheduleInfo.loaninfo.productId),
          //accountId: update during disbursement,
          sanctionId: Math.random().toString().substring(2, 12),
          sanctionLimit: Number(loanMemberScheduleInfo.loaninfo.disbursementAmount),
          sanctionBy: Number(userId),
          sanctionDate: new Date(),
          disbursedDate: new Date(loanMemberScheduleInfo.loaninfo.disbursementDate as any).toLocaleDateString("en-GB"),
          serviceChargeRate: Number(loanMemberScheduleInfo.scheduleinfo[0].serviceChargeRate),
          profitAmount: Number(loanMemberScheduleInfo.scheduleinfo[0].serviceCharge),
          installmentNo: Number(loanMemberScheduleInfo.loaninfo.noOfInstallment),
          loanFrequency: "M",
          installmentFrequency: productInfo.rep_frq,
          purposeId: loanMemberScheduleInfo.loaninfo.purposeId,
          authorizeStatus: "A",
          authorizedBy: Number(userId),
          authorizedAt: new Date(),
          isDisbursed: false,
          createdBy: Number(userId),
          createdAt: new Date(),
        });

        const resGlobalLimit = await (await transaction.query(sql, params)).rows[0];
        if (!resGlobalLimit.id) {
          throw new BadRequestError("Something went wrong in global limit insert");
        }

        //Get CustomerID By Customer Old Code

        if (!samityInfo.id) {
          throw new BadRequestError("samity id not found");
        }
        const accSerialSql = `SELECT COUNT(*) FROM loan.global_limit WHERE customer_id = $1`;
        const accSerialInfo = (await transaction.query(accSerialSql, [Number(customerId.id)])).rows[0];
        const accountPrefixSql = `SELECT account_prefix FROM loan.product_mst WHERE id = $1`;
        const accountPrefix = (
          await transaction.query(accountPrefixSql, [Number(loanMemberScheduleInfo.loaninfo.productId)])
        ).rows[0]?.account_prefix;
        if (!accountPrefix) throw new BadRequestError(`প্রদত্ত প্রোডাক্টে অ্যাকাউন্ট প্রিফিক্স উল্লেখ নেই`);
        const { sql: customerLoanAccountSql, params: customerLoanAccountParams } = buildInsertSql("loan.account_info", {
          samityId: Number(samityInfo.id),
          customerId: Number(customerId.id),
          doptorId: samityInfo.doptorId,
          projectId: Number(samityInfo.projectId),
          officeId: samityInfo.officeId,
          productId: Number(loanMemberScheduleInfo.loaninfo.productId),
          accountNo:
            loanMemberScheduleInfo.customerCode + accountPrefix + (await this.leftPadding(accSerialInfo.count, 2)),
          accountTitle: loanMemberScheduleInfo.nameBn,
          openDate: new Date(),
          accountStatus: "ACT",
          withdrawInstruction: "N",
          alltrn: "C",
          authorizeStatus: "A",
          createdBy: userId,
          createdAt: new Date(),
        });
        let resCusLoanAccount;
        try {
          resCusLoanAccount = (await transaction.query(customerLoanAccountSql, customerLoanAccountParams)).rows[0];
        } catch (error: any) {
          throw new BadRequestError(error);
        }
        if (!resCusLoanAccount.id) {
          throw new BadRequestError("something went wrong in creating loan account");
        }
        const { sql: loanAccountBalSql, params: loanAccountBalParams } = buildInsertSql("loan.account_balance", {
          doptorId: samityInfo.doptorId,
          projectId: Number(samityInfo.projectId),
          officeId: samityInfo.officeId,
          productId: Number(loanMemberScheduleInfo.loaninfo.productId),
          accountId: resCusLoanAccount.id,
          currentBalance: Number(
            loanMemberScheduleInfo.loaninfo.disbursementAmount - loanMemberScheduleInfo.loaninfo.paidPrincipalAmount
          ),
          blockAmt: 0,
          createdBy: userId,
          createdAt: new Date(),
        });
        let accountBalanceResponse;
        try {
          accountBalanceResponse = await (await transaction.query(loanAccountBalSql, loanAccountBalParams)).rows[0];
        } catch (error: any) {
          throw new BadRequestError(error);
        }
        if (!accountBalanceResponse.id) {
          throw new BadRequestError("error in account balance update");
        }

        for (const value of loanMemberScheduleInfo.scheduleinfo) {
          const { sql: scheduleSql, params: scheduleParams } = buildInsertSql("loan.schedule_info", {
            doptorId: samityInfo.doptorId,
            projectId: Number(samityInfo.projectId),
            productId: Number(loanMemberScheduleInfo.loaninfo.productId),
            samityId: Number(samityInfo.id),
            customerId: Number(customerId.id),
            accountId: resCusLoanAccount.id,
            installmentNo: value.scheduleNo,
            dueDate: new Date(value.installmentDate as any).toLocaleDateString("en-GB"),
            principalAmount: value.installmentPrincipalAmt,
            interestAmount: value.installmentServiceChargeAmt,
            principalPaidAmount: value.principalPaidAmount,
            interestPaidAmount: value.interestPaidAmount,
            totalPaidAmount: parseFloat(value.principalPaidAmount) + parseFloat(value.interestPaidAmount),
            paidBy: userId,
            totalAmount: value.total,
            createdBy: userId,
            createdAt: new Date(),
          });
          let scheduleInsertResponse;

          try {
            scheduleInsertResponse = (await transaction.query(scheduleSql, scheduleParams)).rows[0];
          } catch (error: any) {
            throw new BadRequestError(error);
          }
          if (!scheduleInsertResponse.id) {
            throw new BadRequestError("Error in schedule info insert");
          }
        }
        // throw new BadRequestError("please wait ");
        let { sql: tranSql, params: tranParams } = buildInsertSql("loan.transaction_daily", {
          doptorId: samityInfo.doptorId,
          officeId: samityInfo.officeId,
          projectId: samityInfo.projectId,
          productId: loanMemberScheduleInfo.loaninfo.productId,
          accountId: resCusLoanAccount.id,
          tranType: "CASH",
          tranNum: tranNum,
          tranCode: "LDG",
          tranDate: transactionDate?.openCloseDate,
          valDate: new Date(),
          naration: "Loan Info Migration Disbursement",
          drcrCode: "D",
          tranAmt: loanMemberScheduleInfo.loaninfo.disbursementAmount,
          batchNum: batchNum,
          authorizeStatus: "A",
          isMigrated: true,
          createdBy: userId,
          createdAt: new Date(),
        });
        const disburseResponse = await (await transaction.query(tranSql, tranParams)).rows[0];
        if (!disburseResponse.id) {
          throw new BadRequestError("error in disbursement insert");
        }
        if (loanMemberScheduleInfo?.loaninfo?.paidPrincipalAmount) {
          let { sql: tranSqlForRepayment, params: tranParamsForRepayment } = buildInsertSql("loan.transaction_daily", {
            doptorId: samityInfo.doptorId,
            officeId: samityInfo.officeId,
            projectId: samityInfo.projectId,
            productId: loanMemberScheduleInfo.loaninfo.productId,
            accountId: resCusLoanAccount.id,
            tranType: "CASH",
            tranNum: tranNum,
            tranCode: "REP",
            tranDate: transactionDate?.openCloseDate,
            valDate: new Date(),
            naration: "Loan Info Migration For Repayment Principal",
            drcrCode: "C",
            tranAmt: loanMemberScheduleInfo.loaninfo.paidPrincipalAmount,
            batchNum: batchNum,
            authorizeStatus: "A",
            isMigrated: true,
            createdBy: userId,
            createdAt: new Date(),
          });
          const rpeayPrincipalResponse = await (
            await transaction.query(tranSqlForRepayment, tranParamsForRepayment)
          ).rows[0];
          if (!rpeayPrincipalResponse.id) {
            throw new BadRequestError("error in repayment principal insert");
          }
        }
        if (loanMemberScheduleInfo?.loaninfo?.paidServiceChargeAmount) {
          let { sql: tranSqlRepaymentServiceCharge, params: tranParamsRepaymentServiceCharge } = buildInsertSql(
            "loan.transaction_daily",
            {
              doptorId: samityInfo.doptorId,
              officeId: samityInfo.officeId,
              projectId: samityInfo.projectId,
              productId: loanMemberScheduleInfo.loaninfo.productId,
              accountId: resCusLoanAccount.id,
              tranType: "CASH",
              tranNum: tranNum,
              tranCode: "INC",
              tranDate: transactionDate?.openCloseDate,
              valDate: new Date(),
              naration: "Loan Info Migration For Repayment ServiceCharge",
              drcrCode: "C",
              tranAmt: loanMemberScheduleInfo.loaninfo.paidServiceChargeAmount,
              batchNum: batchNum,
              authorizeStatus: "A",
              isMigrated: true,
              createdBy: userId,
              createdAt: new Date(),
            }
          );
          const repayServiceChargeResponse = await (
            await transaction.query(tranSqlRepaymentServiceCharge, tranParamsRepaymentServiceCharge)
          ).rows[0];
          if (!repayServiceChargeResponse.id) {
            throw new BadRequestError("error in repayment service charge principal insert");
          }
        }
        if (loanMemberScheduleInfo?.loaninfo?.penalCharge) {
          const nextTranIdSql = `SELECT nextval('loan.transaction_daily_id_seq') tran_id`;
          let penalNextTranId = (await transaction.query(nextTranIdSql)).rows[0].tran_id;
          let { sql: tranSqlRepaymentServiceCharge, params: tranParamsRepaymentServiceCharge } = buildInsertSql(
            "loan.transaction_daily",
            {
              id: penalNextTranId,
              doptorId: samityInfo.doptorId,
              officeId: samityInfo.officeId,
              projectId: samityInfo.projectId,
              productId: loanMemberScheduleInfo.loaninfo.productId,
              accountId: resCusLoanAccount.id,
              tranType: "CASH",
              tranNum: tranNum,
              tranCode: "PNC",
              tranDate: transactionDate?.openCloseDate,
              valDate: new Date(),
              naration: "Loan Info Migration For Penal Charge",
              drcrCode: "C",
              tranAmt: loanMemberScheduleInfo.loaninfo.penalCharge,
              batchNum: batchNum,
              authorizeStatus: "A",
              isMigrated: true,
              createdBy: userId,
              createdAt: new Date(),
            }
          );
          const repayServiceChargeResponse = await (
            await transaction.query(tranSqlRepaymentServiceCharge, tranParamsRepaymentServiceCharge)
          ).rows[0];
          if (!repayServiceChargeResponse.id) {
            throw new BadRequestError("error in repayment service charge principal insert");
          }
          const { sql: incSerCrgSql, params: incSerCrgParams } = buildInsertSql("loan.service_charge_info", {
            doptorId: samityInfo.doptorId,
            officeId: samityInfo.officeId,
            projectId: samityInfo.projectId,
            productId: loanMemberScheduleInfo.loaninfo.productId,
            accountId: resCusLoanAccount.id,
            tranCode: "PNC",
            drcrCode: "C",
            refDocNo: tranNum,
            amount: loanMemberScheduleInfo.loaninfo.penalCharge,
            refTranId: penalNextTranId,
            createdBy: userId,
            createdAt: new Date(),
            tranDate: transactionDate?.openCloseDate,
            valDate: new Date(),
          });

          const incSerCrgInfo = (await transaction.query(incSerCrgSql, incSerCrgParams)).rows[0];
        }

        const { sql: globalLimitsql, params: globalLimitparams } = buildUpdateWithWhereSql(
          "loan.global_limit",
          { customerId: Number(customerId.id) },
          {
            accountId: resCusLoanAccount.id,
            isDisbursed: true,
            disbursedBy: userId,
            updatedBy: userId,
            updatedAt: new Date(),
          }
        );

        const resGlobalLimitUpdate = (await transaction.query(globalLimitsql, globalLimitparams)).rows[0];
        if (!resGlobalLimitUpdate.id) {
          throw new BadRequestError("global limit update error");
        }
      }
      const updateQuery = `UPDATE
        temps.application
      SET
        status = $1,
        updated_at = $2,
        updated_by = $3,
        next_app_designation_id = $4
      WHERE
        id = $5 returning *`;
      const updateParams = [
        serviceAction.applicationStatus,
        new Date(),
        userId,
        data.nextAppDesignationId ? data.nextAppDesignationId : 0,
        Number(data.applicationId),
      ];

      const [applicationData] = (await transaction.query(updateQuery, updateParams)).rows;

      if (!applicationData) throw new BadRequestError("আবেদনটি খুঁজে পাওয়া যাইনি");

      return "Successfull";
    } catch (error: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(error);
    }
  }

  async deleteMembers(samityId: number, memberCodes: string[]) {
    const connection = db.getConnection("master");
    const {
      data,
      data: { members },
    }: { data: { members: SamityMigrationMemberInput[] } } = await this.getById(samityId);
    let newMembers: SamityMigrationMemberInput[] = [];

    if (members && isArray(members)) {
      newMembers = members.filter((m) => !memberCodes.includes(m.customerOldCode));
    }

    data.members = newMembers;

    const sql = buildUpdateWithWhereSql(
      "temps.migration_staging_area",
      {
        id: samityId,
      },
      { data }
    );

    await connection.query(sql.sql, sql.params);

    return true;
  }

  async deleteSamity(samityId: number) {
    const connection = db.getConnection("master");

    const sql = `delete from temps.migration_staging_area where id =$1`;
    const params = [samityId];

    await connection.query(sql, params);

    return true;
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM samity.samity_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM samity.samity_info";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }
  async getApprovedMigratedSamity(
    doptorId: Number,
    officeId: number,
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object,
    withoutLoanApproved: false,
    dpsFdrMigration?: boolean,
    districtId?: number,
    upazilaId?: number,
    projectId?: number
  ) {
    let result;
    const pool = await db.getConnection("slave");

    if (!withoutLoanApproved) {
      let queryText: string = "";
      const sql: string = "SELECT * FROM samity.samity_info";

      allQuery = { ...allQuery, doptorId, officeId };

      const allQueryValues: any[] = Object.values(allQuery);
      if (Object.keys(allQuery).length > 0) {
        console.log("in1709");
        const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);

        const queryText = isPagination ? createSql[0] : createSql[1];

        result = (await pool.query(queryText, allQueryValues)).rows;
      } else {
        queryText = isPagination
          ? "SELECT * FROM samity.samity_info WHERE doptor_id = $1 AND office_id = $2 AND is_active = true ORDER BY id LIMIT $2 OFFSET $3"
          : "SELECT * FROM samity.samity_info WHERE doptor_id = $1 AND office_id = $2 AND is_active = true ORDER BY id";

        result = (
          await pool.query(queryText, isPagination ? [doptorId, officeId, limit, offset] : [doptorId, officeId])
        ).rows;
      }
    } else {
      let sql;
      if (dpsFdrMigration) {
        sql = `select * from samity.samity_info where project_id = $1
        and doptor_id = $2 and office_id = $3 and district_id = $4
        and upa_city_id = $5`;
        //  and is_migrated=true

        const params = [projectId, doptorId, officeId, districtId, upazilaId];

        result = (await pool.query(sql, params)).rows;
        return result.length > 0 ? toCamelKeys(result) : [];
      } else {
        sql = `SELECT DISTINCT A.ID,
        A.SAMITY_NAME
      FROM SAMITY.SAMITY_INFO A
      WHERE A.DOPTOR_ID = $1
        AND A.FLAG = $2
        AND A.OFFICE_ID = $3
        AND NOT EXISTS
          (SELECT 1
            FROM LOAN.GLOBAL_LIMIT B
            WHERE B.SAMITY_ID = A.ID )`;
      }

      const { flag } = allQuery as { flag: boolean };

      const params = [doptorId, flag, officeId];

      result = (await pool.query(sql, params)).rows;
    }

    return result.length > 0 ? toCamelKeys(result) : [];
  }
}
