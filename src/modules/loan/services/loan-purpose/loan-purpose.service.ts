import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import lodash from "lodash";
import { buildUpdateWithWhereSql } from "../../../../utils/sql-builder.util";
import BadRequestError from "../../../../errors/bad-request.error";

@Service()
export class LoanPurposeServices {
  constructor() {}

  async getLoanPurposeCategory() {
    const pool = db.getConnection("slave");
    const categorySql = "SELECT * FROM master.loan_purpose_category order by id";
    let categories = (await pool.query(categorySql)).rows;
    for (let [index, category] of categories.entries()) {
      const subCategorySql = "SELECT * FROM master.loan_purpose_sub_category WHERE category_id = $1";
      let subCategories = (await pool.query(subCategorySql, [category.id])).rows;
      categories[index] = { ...category, subCategories };
    }
    return categories.length > 0 ? toCamelKeys(categories) : {};
  }

  async getLoanPurpose() {
    const pool = db.getConnection("slave");
    const loanPurposeSql = `SELECT c.id,
    a.id category_id,
    a.category_name,
     b.id sub_category_id,
    b.sub_category_name,
    c.purpose_name,
    c.is_active status
  FROM master.loan_purpose_category a
  INNER JOIN master.loan_purpose_sub_category b ON a.id = b.category_id
  INNER JOIN master.loan_purpose c ON a.id = c.category_id
  AND b.id = c.sub_category_id`;
    let loanPurpose = (await pool.query(loanPurposeSql)).rows;

    return loanPurposeSql.length > 0 ? toCamelKeys(loanPurpose) : [];
  }

  async createLoanPurposeCategory(data: any) {
    const client = await db.getConnection().connect();
    try {
      await client.query("BEGIN");
      let result, subCategoryResult, message;
      if (data.id) {
        const uniqueCheckQuery = `SELECT COUNT(*) FROM master.loan_purpose_category WHERE category_name = $1 AND id != $2`;
        const uniqueCheckCount = (await client.query(uniqueCheckQuery, [data.categoryName, data.id])).rows[0]?.count;
        if (uniqueCheckCount > 0) {
          throw new BadRequestError(`ক্যাটাগরির নাম বিদ্যমান আছে`);
        }
        let { sql, params } = buildUpdateWithWhereSql(
          "master.loan_purpose_category",
          { id: data.id },
          { ...lodash.omit(data, ["subCategories"]), isActive: true }
        );
        result = (await client.query(sql, params)).rows[0];
        message = "সফলভাবে হালনাগাদ করা হয়েছে";
      } else {
        const uniqueCheckQuery = `SELECT COUNT(*) FROM master.loan_purpose_category WHERE category_name = $1`;
        const uniqueCheckCount = (await client.query(uniqueCheckQuery, [data.categoryName])).rows[0]?.count;
        if (uniqueCheckCount > 0) {
          throw new BadRequestError(`Category can not be repeated`);
        }
        let { sql, params } = buildInsertSql("master.loan_purpose_category", {
          ...lodash.omit(data, ["subCategories"]),
          isActive: true,
        });
        result = (await client.query(sql, params)).rows[0];
        message = "সফলভাবে তৈরি করা হয়েছে";
      }
      for (let subCategory of data.subCategories) {
        if (subCategory.id == -1) {
          let { sql, params } = buildInsertSql("master.loan_purpose_sub_category", {
            ...lodash.omit(subCategory, ["id"]),
            createdBy: data.createdBy,
            categoryId: result.id,
          });
          subCategoryResult = (await client.query(sql, params)).rows[0];
        } else {
          let { sql, params } = buildUpdateWithWhereSql(
            "master.loan_purpose_sub_category",
            { id: subCategory.id },
            { ...subCategory, createdBy: data.createdBy, categoryId: result.id }
          );
          subCategoryResult = (await client.query(sql, params)).rows[0];
        }
      }
      await client.query("COMMIT");
      return result && message ? (toCamelKeys({ result, message }) as any) : {};
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async createLoanPurpose(data: any) {
    const pool = db.getConnection("master")
      let result,subCategoryResult, message;
      if(data.id){
        let { sql, params } = buildUpdateWithWhereSql("master.loan_purpose",{id: data.id}, { ...lodash.omit(data), isActive: true });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে হালনাগাদ করা হয়েছে";
      }else{
        let { sql, params } = buildInsertSql("master.loan_purpose", { ...lodash.omit(data), isActive: true });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে তৈরি করা হয়েছে";
      }
     
      return result && message ? toCamelKeys({result, message}) as any : {}
    
  }

  async getLoanPurposeMappingList(projectId : number){
    const pool = db.getConnection("slave");
    const sql = `SELECT a.id purpose_id, a.purpose_name, a.category_id, b.category_name, 
    a.sub_category_id, c.sub_category_name FROM master.loan_purpose a
    INNER JOIN master.loan_purpose_category b ON a.category_id = b.id
    INNER JOIN master.loan_purpose_sub_category c ON a.sub_category_id = c.id`;

    const result = (await pool.query(sql)).rows;
    const sql2 = `SELECT COUNT(*) FROM master.loan_purpose_mapping
    WHERE project_id = $1 AND
    purpose_id = $2 AND
    category_id = $3 AND
    sub_category_id = $4`

    for(let [index,value] of result.entries()){
    
      let count = (await pool.query(sql2, [projectId, value.purpose_id, value.category_id, value.sub_category_id])).rows[0].count;
      if(count>0)
      {
        result[index].status = true;
      }
      else
      {
        result[index].status = false;
      }
    }
return result[0]?toCamelKeys(result):[]

  }
}
