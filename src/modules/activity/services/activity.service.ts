/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-05-21 14:22:11
 * @modify date 2023-05-21 14:22:11
 * @desc [description]
 */

import { buildGetSql, buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import { ActivityLogAttrs, ErrorLogAttrs } from "../interfaces/activity.interface";

@Service()
export class ActivityServices {
  constructor() {}

  async create(activityLog: ActivityLogAttrs) {
    const connection = await pgConnect.getConnection("log");
    const slaveConnection = await pgConnect.getConnection("slave");

    //get feature id and name
    const featureSql = buildGetSql(["id", "feature_name", "feature_name_ban"], "users.feature", {
      url: activityLog.activity.url,
      componentId: activityLog.componentId,
    });

    const {
      rows: [feature],
    } = await slaveConnection.query(featureSql.queryText, featureSql.values);

    let activity = activityLog.activity;

    activity = {
      ...activity,
      featureId: feature?.id || "",
      featureName: feature?.feature_name || "",
      featureNameBan: feature?.feature_name_ban || "",
    };
    activityLog.activity = activity;

    const activitySql = buildInsertSql("log.activity_log", activityLog);

    await connection.query(activitySql.sql, activitySql.params);
  }
  async createFrontEndErrorLog(errorLog: ErrorLogAttrs) {
    const connection = await pgConnect.getConnection("log");
    const { sql, params } = buildInsertSql("log.front_end_error_log", errorLog);
    const queryResultId = await (await connection.query(sql, params))?.rows[0]?.id;
    return queryResultId ? queryResultId : null;
  }
}
