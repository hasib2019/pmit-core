import { toCamelKeys } from "keys-transform";
import lodash from "lodash";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import BadRequestError from "../../../../errors/bad-request.error";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../../utils/sql-builder.util";
import { userLimitInput } from "../../interfaces/user-limit/userlimit.interfece";

@Service()
export class UserLimitServices {
  constructor() {}

  async create(data: userLimitInput) {
    const returnValue = [];
    let loanApproveLimit;
    if (data.saveStatus == 1) {
      if (!data.roleId) throw new BadRequestError(`রোলের নাম দেওয়া আবশ্যক`);
      loanApproveLimit = await this.createUserLimitForRole(
        data.loanApproveLimit,
        Number(data.roleId),
        "loan.role_wise_user_limit",
        data.createdBy,
        data.doptorId
      );
    } else if (data.saveStatus == 2) {
      loanApproveLimit = await this.createUserLimitForUser(
        data.loanApproveLimit,
        "loan.user_loan_approval_lmt",
        data.createdBy,
        data.doptorId
      );
    } else {
      throw new BadRequestError(`need to do work for role`);
    }

    return { loanApproveLimit };
  }
  async createUserLimitForUser(data: any, tableName: string, createOrUpdateBy: any, doptorId: any) {
    const pool = db.getConnection("master");
    let returnValue = [];
    for (const element of data) {
      if (element.id) {
        const { sql: upadteSql, params: upadteParams } = buildUpdateWithWhereSql(
          tableName,
          { id: element.id, userId: element.userId },
          {
            ...element,
            // userId: data.userId,
            doptorId,
            updatedBy: createOrUpdateBy,
            updatedAt: new Date(),
          }
        );
        const result = (await pool.query(upadteSql, upadteParams)).rows[0];
        returnValue.push(result);
      } else {
        const { sql: createSql, params: createParams } = buildInsertSql(tableName, {
          ...element,
          // userId: data.userId,
          doptorId,
          createdBy: createOrUpdateBy,
          createdAt: new Date(),
        });

        const result = (await pool.query(createSql, createParams)).rows[0];

        returnValue.push(result);
      }
    }
    return returnValue.length > 0 ? toCamelKeys(returnValue) : [];
  }

  async createUserLimitForRole(data: any, roleId: number, tableName: string, createOrUpdateBy: any, doptorId: any) {
    const client = await db.getConnection("master").connect();
    try {
      client.query("BEGIN");
      let result;
      let finalResponse = [];
      for (const element of data) {
        if (element.id) {
          const { sql: upadteSql, params: upadteParams } = buildUpdateWithWhereSql(
            tableName,
            { id: element.id, roleId: roleId },
            {
              ...lodash.omit(element, ["id", "roleName", "productName", "userId"]),
              doptorId,
              updatedBy: createOrUpdateBy,
              updatedAt: new Date(),
            }
          );
          result = (await client.query(upadteSql, upadteParams)).rows[0];
          finalResponse.push(result);
          const allRoleUsersSql = `SELECT user_id FROM users.user_role WHERE role_id = $1`;
          const allRoleUsers = (await client.query(allRoleUsersSql, [roleId])).rows;
          let allRoleUsersIds = allRoleUsers.map((value: any) => value.user_id);
          allRoleUsersIds = allRoleUsersIds.filter((v, i, a) => a.indexOf(v) === i);
          const userCountInLimitSql = `SELECT 
                                      COUNT(*) 
                                    FROM 
                                      loan.user_loan_approval_lmt 
                                    WHERE 
                                      doptor_id = $1 
                                      AND project_id = $2 
                                      AND product_id = $3 
                                      AND user_id = $4`;
          for (let singleUser of allRoleUsersIds) {
            let userCountInLimit = (
              await client.query(userCountInLimitSql, [doptorId, element.projectId, element.productId, singleUser])
            ).rows[0]?.count;
            if (userCountInLimit != 0) {
              let { sql: userLimitUpdateSql, params: userLimitUpdateParams } = buildUpdateWithWhereSql(
                "loan.user_loan_approval_lmt",
                {
                  doptorId,
                  projectId: element.projectId,
                  productId: element.productId,
                  userId: singleUser,
                },
                {
                  limitAmount: element.limitAmount,
                  updatedBy: createOrUpdateBy,
                  updatedAt: new Date(),
                }
              );
              const userLimitUpdateRes = (await client.query(userLimitUpdateSql, userLimitUpdateParams)).rows[0];
            } else {
              let { sql: userLimitInsertSql, params: userLimitInsertParams } = buildInsertSql(
                "loan.user_loan_approval_lmt",
                {
                  doptorId,
                  projectId: element.projectId,
                  productId: element.productId,
                  userId: singleUser,
                  limitAmount: element.limitAmount,
                  createdBy: createOrUpdateBy,
                }
              );
              const userLimitInsertRes = (await client.query(userLimitInsertSql, userLimitInsertParams)).rows[0];
            }
          }
        } else {
          const { sql: createSql, params: createParams } = buildInsertSql(tableName, {
            ...lodash.omit(element, ["roleName", "productName", "userId"]),
            roleId: roleId,
            // userId: data.userId,
            doptorId,
            createdBy: createOrUpdateBy,
            createdAt: new Date(),
          });

          result = (await client.query(createSql, createParams)).rows[0];
          finalResponse.push(result);

          const allRoleUsersSql = `SELECT user_id FROM users.user_role WHERE role_id = $1`;
          const allRoleUsers = (await client.query(allRoleUsersSql, [roleId])).rows;
          let allRoleUsersIds = allRoleUsers.map((value: any) => value.user_id);
          allRoleUsersIds = allRoleUsersIds.filter((v, i, a) => a.indexOf(v) === i);
          const userCountInLimitSql = `SELECT 
                                      COUNT(*) 
                                    FROM 
                                      loan.user_loan_approval_lmt 
                                    WHERE 
                                      doptor_id = $1 
                                      AND project_id = $2 
                                      AND product_id = $3 
                                      AND user_id = $4`;
          for (let singleUser of allRoleUsersIds) {
            let userCountInLimit = (
              await client.query(userCountInLimitSql, [doptorId, element.projectId, element.productId, singleUser])
            ).rows[0]?.count;
            if (userCountInLimit != 0) {
              let { sql: userLimitUpdateSql, params: userLimitUpdateParams } = buildUpdateWithWhereSql(
                "loan.user_loan_approval_lmt",
                {
                  doptorId,
                  projectId: element.projectId,
                  productId: element.productId,
                  userId: singleUser,
                },
                {
                  limitAmount: element.limitAmount,
                  updatedBy: createOrUpdateBy,
                  updatedAt: new Date(),
                }
              );
              const userLimitUpdateRes = (await client.query(userLimitUpdateSql, userLimitUpdateParams)).rows[0];
            } else {
              let { sql: userLimitInsertSql, params: userLimitInsertParams } = buildInsertSql(
                "loan.user_loan_approval_lmt",
                {
                  doptorId,
                  projectId: element.projectId,
                  productId: element.productId,
                  userId: singleUser,
                  limitAmount: element.limitAmount,
                  createdBy: createOrUpdateBy,
                }
              );
              const userLimitInsertRes = (await client.query(userLimitInsertSql, userLimitInsertParams)).rows[0];
            }
          }
        }
      }
      await client.query("COMMIT");
      return finalResponse.length > 0 ? toCamelKeys(finalResponse) : [];
    } catch (error: any) {
      client.query("ROLLBACK");
      throw new BadRequestError(String(error).substring(7));
    } finally {
      client.release();
    }
  }

  async get(projectId: number, userId: number | null, roleId: number | null, status: number) {
    if (status == 1 && !roleId) throw new BadRequestError(`রোলের নাম দেওয়া আবশ্যক`);
    else if (status == 2 && !userId) throw new BadRequestError(`ব্যবহারকারীর নাম দেওয়া আবশ্যক`);
    else {
      const pool = db.getConnection("slave");
      let productLoanApproveSql = ``;
      let productLoanApprove = [];
      if (roleId) {
        productLoanApproveSql = `SELECT 
                                b.id,
                                b.role_id, 
                                a.role_name, 
                                b.project_id, 
                                b.product_id, 
                                c.product_name, 
                                b.limit_amount 
                              FROM 
                                users.role a 
                                LEFT JOIN loan.role_wise_user_limit b ON a.id = b.role_id 
                                LEFT JOIN loan.product_mst c ON b.product_id = c.id 
                              WHERE 
                                b.project_id = $1
                                AND b.role_id = $2`;

        productLoanApprove = (await pool.query(productLoanApproveSql, [projectId, roleId])).rows;

        const allProductLimitSql = `select
                                    product_name,
                                    id as product_id,
                                    project_id,
                                    0 as limit_amount
                                  from loan.product_mst
                                  where
                                    project_id = $1`;
        const allProductLimitInfo = (await pool.query(allProductLimitSql, [projectId])).rows;
        const allProductLimitIds = allProductLimitInfo.map((value: any) => value.product_id);

        const productLoanApproveIds = productLoanApprove.map((value: any) => value.product_id);
        let nonAssignProductLimit = [];
        for (let [index, value] of allProductLimitIds.entries()) {
          if (!productLoanApproveIds.includes(value)) {
            nonAssignProductLimit.push(allProductLimitInfo[index]);
          } else {
            continue;
          }
        }
        productLoanApprove = [...productLoanApprove, ...nonAssignProductLimit];
        if (productLoanApprove.length <= 0) {
          productLoanApproveSql = `select
                                  product_name,
                                  id as product_id,
                                  0 as loan_limit
                                from loan.product_mst
                                where
                                  project_id = $1`;
          productLoanApprove = (await pool.query(productLoanApproveSql, [projectId])).rows;
        }
      } else if (userId) {
        productLoanApproveSql = `select
                                a.id, 
                                a.limit_amount,
                                b.product_name,
                                b.project_id,
                                b.id as limit_type_id,
                                b.id as product_id
                              from
                                loan.user_loan_approval_lmt a
                              right join loan.product_mst b on
                                a.product_id = b.id
                              where
                                b.project_id = $1
                                and a.user_id = $2`;

        productLoanApprove = (await pool.query(productLoanApproveSql, [projectId, userId])).rows;

        const allProductLimitSql = `select
                                    product_name,
                                    id as product_id,
                                    project_id,
                                    0 as limit_amount
                                  from loan.product_mst
                                  where
                                    project_id = $1`;
        const allProductLimitInfo = (await pool.query(allProductLimitSql, [projectId])).rows;
        const allProductLimitIds = allProductLimitInfo.map((value: any) => value.product_id);
        const productLoanApproveIds = productLoanApprove.map((value: any) => value.product_id);
        let nonAssignProductLimit = [];
        for (let [index, value] of allProductLimitIds.entries()) {
          if (!productLoanApproveIds.includes(value)) {
            nonAssignProductLimit.push(allProductLimitInfo[index]);
          } else {
            continue;
          }
        }
        productLoanApprove = [...productLoanApprove, ...nonAssignProductLimit];
        if (productLoanApprove.length <= 0) {
          productLoanApproveSql = `select
                                  product_name,
                                  id as product_id,
                                  0 as loan_limit
                                from loan.product_mst
                                where
                                  project_id = $1`;
          productLoanApprove = (await pool.query(productLoanApproveSql, [projectId])).rows;
        }
      }

      return { productLoanApprove };
    }
  }
}
