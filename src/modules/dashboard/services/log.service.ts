import axios from "axios";
import { buildGetSql, buildInsertSql, buildUpsertSql } from "rdcd-common";
import { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import db from "../../../db/connection.db";
import { ComponentType } from "../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";

@Service()
export class SyncLogService {
  constructor() {}

  async storeLog(
    requestType: string,
    requestUrl: string,
    requestInfo: any,
    responseInfo: any,
    errorMessage: any,
    resStatusCode: number,
    isSuccess: boolean
  ) {
    const logDbConnection = db.getConnection("log");

    const getMaxReqNoSql = `SELECT COALESCE(MAX(request_num), 0) max_request_num FROM log.dashboard_api_log`;

    //calculate the api request number
    let requestNum = (await logDbConnection.query(getMaxReqNoSql)).rows[0]?.max_request_num;
    requestNum = requestNum ? Number(requestNum) + 1 : 1;

    let { sql: logSql, params: logParams } = buildInsertSql("log.dashboard_api_log", {
      requestNum,
      requestUrl,
      ...(errorMessage && { errorMessage }),
      // JSON.stringify(error?.response?.data?.errors ? error.response.data.errors : error),
      // resStatusCode: error?.response?.status,
      requestDate: new Date(),
      requestType,
      requestInfo,
      ...(responseInfo && { responseInfo }),
      requestStatus: isSuccess ? "SUCCESS" : "FAIL",
      resStatusCode,
      createdAt: new Date(),
    });
    console.log({ logSql, logParams });

    let successLog = (await logDbConnection.query(logSql, logParams)).rows[0];
  }
}
