/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-19 11:49:53
 * @modify date 2022-06-19 11:49:53
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { pickBy } from "lodash";
import { PoolClient } from "pg";
import { buildGetSql, buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { ComponentNotification } from "../interfaces/component.interface";
import lodash from "lodash";

@Service()
export class ComponentNotificationService {
  constructor() {}

  async create({}: ComponentNotification, transaction?: PoolClient) {
    const vConnection = transaction ? transaction : db.getConnection("master");

    //sender notification
    const senderInfo = {
      ...arguments[0],
      content: arguments[0]?.content
        ? { ...lodash.omit(arguments[0].content, "message"), message: arguments[0]?.content.message.from }
        : {},
    };
    const { sql: senderSql, params: senderParams } = buildInsertSql("notification.component", {
      ...arguments[0],
    });
    const senderNotificationInfo = await vConnection.query(senderSql, senderParams);

    //receiver notification
    const receiverInfo = {
      ...arguments[0],
      content: arguments[0]?.content
        ? { ...lodash.omit(arguments[0].content, "message"), message: arguments[0]?.content.message.to }
        : {},
    };
    const { sql: receiverSql, params: receiverParams } = buildInsertSql("notification.component", {
      ...arguments[0],
    });
    const receiverNotificationInfo = await vConnection.query(receiverSql, receiverParams);

    return toCamelKeys({ receiverInfo, receiverNotificationInfo });
  }

  async read(id: number, userType: string, userId: number) {
    const { sql, params } = buildUpdateWithWhereSql(
      "notification.component",
      { id, userType, userId },
      { readAt: new Date(), readStatus: true }
    );

    const {
      rows: [data],
    } = await db.getConnection("master").query(sql, params);

    return toCamelKeys(data);
  }

  async getNotificationById(id: number, userType: string, componentId: number, readStatus?: boolean) {
    const whereCondition = pickBy(
      {
        userType,
        userId: id,
        readStatus,
        componentId,
      },
      (v) => v !== undefined
    );

    const { queryText, values } = buildGetSql(["*"], "notification.component", whereCondition);

    const { rows: data } = await db.getConnection("master").query(queryText, values);

    return toCamelKeys(data);
  }
}
