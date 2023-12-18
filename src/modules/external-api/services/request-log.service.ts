import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { Pool, PoolClient } from "pg";

@Service()
export default class ApiRequestLogServices {
  constructor() {}

  async createExternalApiRequestLog(dbConnection: Pool | PoolClient, data: any) {
    const { sql: requestLogSql, params: requestLogParams } = buildInsertSql("api.request_log", data);
    const requestLogResponse = (await dbConnection.query(requestLogSql, requestLogParams)).rows[0];
    return requestLogResponse ? toCamelKeys(requestLogResponse) : {};
  }
}
