import { toCamelKeys, toSnakeCase } from "keys-transform";
import lodash from "lodash";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";

@Service()
export default class ServiceWiseDocuments {
  constructor() {}

  async serviceWiseDocMapping(data: any) {
    const pool = db.getConnection();
    const otherDocInfoSql = `SELECT doc_type, doc_type_desc FROM master.document_type WHERE id = $1`;
    let result;
    let message;
    let statusCode;
    //member documents config
    if (data.serviceRules.memberDocs && Array.isArray(data.serviceRules.memberDocs)) {
      for (let [index, value] of data.serviceRules.memberDocs.entries()) {
        let otherDocInfo = (await pool.query(otherDocInfoSql, [value.docTypeId])).rows[0];
        data.serviceRules.memberDocs[index] = {
          docTypeId: value.docTypeId,
          docType: otherDocInfo.doc_type,
          docTypeDesc: otherDocInfo.doc_type_desc,
          isMandatory: value.docRadio == "docM" ? true : false,
        };

        data.serviceRules.memberDocs[index] = {
          ...lodash.omit(data.serviceRules.memberDocs[index], ["docRadio", "numMandatory", "numberRadio"]),
        };
      }
    }

    //nominee documents config
    if (data.serviceRules.nomineeDocs && Array.isArray(data.serviceRules.nomineeDocs)) {
      for (let [index, value] of data.serviceRules.nomineeDocs.entries()) {
        let otherDocInfo = (await pool.query(otherDocInfoSql, [value.docTypeId])).rows[0];
        data.serviceRules.nomineeDocs[index] = {
          docTypeId: value.docTypeId,
          docType: otherDocInfo.doc_type,
          docTypeDesc: otherDocInfo.doc_type_desc,
          isMandatory: value.docRadio == "docM" ? true : false,
        };
        data.serviceRules.nomineeDocs[index] = {
          ...lodash.omit(data.serviceRules.nomineeDocs[index], ["docRadio", "numMandatory", "numberRadio"]),
        };
      }
    }
    const existingDocMapSql = `SELECT 
                                id 
                            FROM 
                                master.service_wise_doc_mapping 
                            WHERE 
                                project_id = $1 AND 
                                service_id = $2`;

    const existingDocMapId = (await pool.query(existingDocMapSql, [data.projectId, data.serviceId])).rows[0]?.id;

    //existing document mapping data check
    if (existingDocMapId) {
      const { sql, params } = buildUpdateWithWhereSql(
        "master.service_wise_doc_mapping",
        { id: existingDocMapId },
        {
          serviceRules: data.serviceRules,
          updatedBy: data.createdBy,
          updatedAt: new Date(),
        }
      );
      result = (await pool.query(sql, params)).rows[0];
      message = `সফলভাবে হালনাগাদ করা হয়েছে`;
      statusCode = 200;
    } else {
      const { sql, params } = buildInsertSql("master.service_wise_doc_mapping", {
        doptorId: data.doptorId,
        projectId: data.projectId,
        serviceId: data.serviceId,
        serviceRules: data.serviceRules,
        createdBy: data.createdBy,
      });
      result = (await pool.query(sql, params)).rows[0];
      message = `সফলভাবে তৈরি হয়েছে`;
      statusCode = 201;
    }
    return result ? { message, statusCode, result: toCamelKeys(result) } : {};
  }
  async count(allQuery: object) {
    var queryText: string = "";
    const pool = db.getConnection("slave");
    const sql: string = "SELECT COUNT(id) FROM master.service_wise_doc_mapping";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = (await pool.query(queryText, allQueryValues)).rows[0]?.count;
    } else {
      queryText = "SELECT COUNT(id) FROM master.service_wise_doc_mapping";
      result = (await pool.query(queryText)).rows[0]?.count;
    }
    return result;
  }
  async getServiceWiseDocMapping(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    const pool = db.getConnection("slave");
    var queryText: string = "";
    let data = [];
    const sql: string = `SELECT 
                          a.*,
                          b.project_name_bangla,
                          c.service_name 
                        FROM 
                          master.service_wise_doc_mapping a
                          LEFT JOIN master.project_info b ON a.project_id = b.id
                          LEFT JOIN master.service_info c ON a.service_id = c.id`;
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      data = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      if (isPagination) {
        queryText = `SELECT 
                      a.*,
                      b.project_name_bangla,
                      c.service_name 
                    FROM 
                      master.service_wise_doc_mapping a
                      LEFT JOIN master.project_info b ON a.project_id = b.id
                      LEFT JOIN master.service_info c ON a.service_id = c.id
                    LIMIT $1 
                    OFFSET $2`;
      } else {
        queryText = `SELECT 
                      a.*,
                      b.project_name_bangla,
                      c.service_name 
                    FROM 
                      master.service_wise_doc_mapping a
                      LEFT JOIN master.project_info b ON a.project_id = b.id
                      LEFT JOIN master.service_info c ON a.service_id = c.id`;
      }

      data = (await pool.query(queryText, isPagination ? [limit, offset] : [])).rows;
    }
    return data[0] ? toCamelKeys(data) : [];
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
