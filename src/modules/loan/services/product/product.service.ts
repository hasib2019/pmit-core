import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";

@Service()
export class ProductService {
  constructor() {}

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM loan.product_mst";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM loan.product_mst";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    let queryText: string = "";
    let result;
    const pool = db.getConnection("slave");
    const sql: string = "SELECT * FROM loan.product_mst";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];

      result = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      queryText = isPagination
        ? "SELECT * FROM loan.product_mst ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM loan.product_mst ORDER BY id";
      result = (await pool.query(queryText, isPagination ? [limit, offset] : [])).rows;
    }
    return result.length > 0 ? toCamelKeys(result) : [];
  }

  async getSingleProductDetails(productId: number) {
    const pool = db.getConnection("slave");
    const productMstSql = `SELECT 
                            a.*, 
                            b.project_name_bangla
                          FROM 
                            loan.product_mst a 
                            INNER JOIN master.project_info b ON b.id = a.project_id 
                          WHERE 
                            a.id = $1`;

    const productMaster = (await pool.query(productMstSql, [productId])).rows[0];
    const productSerCrgSql = `SELECT 
                                id,
                                effect_date, 
                                int_rate, 
                                overdue_int_rate, 
                                currentdue_int_rate, 
                                is_active 
                              FROM 
                                loan.product_interest 
                              WHERE 
                                product_id = $1`;

    const productServiceCharge = (await pool.query(productSerCrgSql, [productId])).rows;
    productServiceCharge.map((value: any) => {
      value.int_rate = parseFloat(value.int_rate);
      value.overdue_int_rate = parseFloat(value.overdue_int_rate);
      value.currentdue_int_rate = parseFloat(value.currentdue_int_rate);
    });
    const productSerCrgSegSQL = `SELECT 
                                  a.id,
                                  a.segregation_id, 
                                  b.segregation_sector_name, 
                                  a.segregation_rate, 
                                  a.gl_id, 
                                  a.is_active 
                                FROM 
                                  loan.service_charge_seg a 
                                  INNER JOIN loan.service_charge_seg_list b ON b.id = a.segregation_id 
                                WHERE 
                                  a.product_id = $1`;
    const serviceChargeSegregation = (await pool.query(productSerCrgSegSQL, [productId])).rows;
    serviceChargeSegregation.map((value: any) => {
      value.segregation_rate = parseFloat(value.segregation_rate);
    });
    const productChargeSql = `SELECT
                                a.id,
                                a.charge_type_id, 
                                b.charge_type_desc, 
                                a.charge_gl, 
                                a.charge_value, 
                                a.effect_date,
                                a.is_active 
                              FROM 
                                loan.product_charge_mst a 
                                INNER JOIN loan.product_charge_type b ON b.id = a.charge_type_id 
                              WHERE 
                                a.product_id = $1`;
    const productCharge = (await pool.query(productChargeSql, [productId])).rows;
    productCharge.map((value: any) => {
      value.charge_value = Number(value.charge_value);
    });
    const productSancPolicySql = `SELECT
                                    id,
                                    loan_no, 
                                    min_amount, 
                                    max_amount, 
                                    pre_disb_interval,
                                    deposit_percent,
                                    share_percent, 
                                    is_active 
                                  FROM 
                                    loan.product_sanction_policy
                                  WHERE 
                                    product_id = $1`;
    const productSanctionPolicy = (await pool.query(productSancPolicySql, [productId])).rows;
    productSanctionPolicy.map((value: any) => {
      value.loan_no = Number(value.loan_no);
      value.min_amount = Number(value.min_amount);
      value.max_amount = Number(value.max_amount);
      value.pre_disb_interval = Number(value.pre_disb_interval);
      value.deposit_percent = parseFloat(value.deposit_percent);
      value.share_percent = parseFloat(value.share_percent);
    });
    const productDocSql = `SELECT 
                            a.id,
                            a.doc_type_id, 
                            b.doc_type_desc, 
                            a.is_mandatory
                          FROM 
                            loan.product_document_mapping a 
                            INNER JOIN master.document_type b ON b.id = a.doc_type_id 
                          WHERE 
                            a.product_id = $1
                            AND a.is_active = true
                            AND b.is_active = true`;
    const productDocuments = (await pool.query(productDocSql, [productId])).rows;

    return toCamelKeys({
      productMaster,
      productServiceCharge,
      serviceChargeSegregation,
      productCharge,
      productSanctionPolicy,
      productDocuments,
    });
  }
  async createSavingsProduct(data: any) {
    const pool = db.getConnection("master");
    const { sql, params } = buildInsertSql("loan.product_mst", {
      ...data,
    });
    const insertSavingsProductResult = await pool.query(sql, params);

    return toCamelKeys(insertSavingsProductResult.rows[0]);
  }
  async checkIsProjectChangeAllowedInEdit(id: number, projectId: number) {
    const pool = await db.getConnection("slave");
    const getProductByIdSql = `select project_id from loan.product_mst where id = $1`;
    const projectIdFromDb = await (await pool.query(getProductByIdSql, [id])).rows[0].project_id;
    if (projectId !== projectIdFromDb) {
      const checkAlreadyHaveAccount = `select count (id) from loan.account_info where project_id =$1 and product_id = $2`;
      const count = await (await pool.query(checkAlreadyHaveAccount, [projectId, id])).rows[0].count;
      return count > 0 ? false : true;
    }
    return true;
  }
  async updateSavingsProduct(data: any, id: number) {
    const pool = await db.getConnection("master");

    const getProductInfoByIdSql = `select product_name,product_code,open_date,project_id,
     product_gl,update_history,is_default_savings
     from loan.product_mst where id = $1`;
    const product = await (await pool.query(getProductInfoByIdSql, [id])).rows[0];
    const productObjectFromDatabase = { ...product };
    const productObjectWithoutUpdateHistory: any = _.omit(toCamelKeys(productObjectFromDatabase), "updateHistory");

    const objectFromUpdatePayload = { ...data };
    const payloadObjectWithoutUpdateAtBy: any = _.omit(toCamelKeys(objectFromUpdatePayload), "updatedAt", "updatedBy");

    const beforeUpdate: any = {};
    const afterUpdate: any = {};
    for (const productKey in productObjectWithoutUpdateHistory) {
      if (productKey == "openDate") {
        const databaseOpenDate = new Date(productObjectWithoutUpdateHistory.openDate).getTime();
        const payloadOpenDate = new Date(payloadObjectWithoutUpdateAtBy.openDate).getTime();
        if (databaseOpenDate !== payloadOpenDate) {
          afterUpdate[productKey] = payloadObjectWithoutUpdateAtBy[productKey];
          beforeUpdate[productKey] = productObjectWithoutUpdateHistory[productKey];
        }
      } else if (
        productObjectWithoutUpdateHistory[productKey] !== payloadObjectWithoutUpdateAtBy[productKey] &&
        product !== "openDate"
      ) {
        afterUpdate[productKey] = payloadObjectWithoutUpdateAtBy[productKey];
        beforeUpdate[productKey] = productObjectWithoutUpdateHistory[productKey];
      }
    }

    // if(beforeUpdate.openDate.getTime() === afterUpdate.openDate.getTime()){}
    const updateHistoryArray = product.update_history ? product.update_history : [];
    updateHistoryArray.push({
      beforeUpdate: beforeUpdate,
      afterUpdate: afterUpdate,
      updatedAt: new Date(),
    });
    payloadObjectWithoutUpdateAtBy.updateHistory = JSON.stringify(updateHistoryArray);
    const { sql, params } = buildUpdateSql("loan.product_mst", id, payloadObjectWithoutUpdateAtBy, "id");

    const productUpdate = await pool.query(sql, params);

    return toCamelKeys(productUpdate.rows[0]);

    // const {sql,params} = buildUpdateSql("loan.product_mst")
  }

  async getProjectWiseProduct(projectIds: any, doptorId: number) {
    const pool = db.getConnection("slave");
    const sql = `select a.*,b.project_name_bangla from loan.product_mst a inner join master.project_info b on a.project_id =b.id where a.project_id = ANY($1::int[])
  
  and a.doptor_id = $2 and a.product_type = 'L'`;

    const projectWiseProducts = await pool.query(sql, [projectIds, doptorId]);
    return toCamelKeys(projectWiseProducts.rows);
  }

  async getSegregatioList(doptorId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  id, 
                  segregation_sector_name 
                FROM 
                  loan.service_charge_seg_list 
                WHERE 
                  doptor_id = $1 
                  AND is_active = true`;
    const result = (await pool.query(sql, [doptorId])).rows;
    return result.length > 0 ? toCamelKeys(result) : [];
  }

  async getChargeTypes() {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  id, 
                  charge_type, 
                  charge_type_desc 
                FROM 
                  loan.product_charge_type 
                WHERE 
                  is_active = true
                ORDER BY id ASC `;
    const result = (await pool.query(sql)).rows;
    return result.length > 0 ? toCamelKeys(result) : [];
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
