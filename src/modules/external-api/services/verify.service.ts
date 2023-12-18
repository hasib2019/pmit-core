/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-07-25 11:13:40
 * @modify date 2023-07-25 11:13:40
 * @desc [description]
 */

import { buildGetSql, buildUpdateWithWhereSql } from "rdcd-common";
import db from "../../../db/connection.db";

export async function verifyApiKey(apiKey: string, route: string, method: string) {
  const connection = await db.getConnection("master");

  const query = buildGetSql(["id", "count"], "users.api_users", { apiKey });

  const { rows: verifyKey } = await connection.query(query.queryText, query.values);

  if (verifyKey.length) {
    const updateSql = buildUpdateWithWhereSql(
      "users.api_users",
      { id: verifyKey[0].id },
      {
        lastAccessedAt: new Date(),
        count: ++verifyKey[0].count,
      }
    );

    await connection.query(updateSql.sql, updateSql.params);

    return await verifyRouteAccess(verifyKey[0].id, route, method);
  }

  return false;
}

async function verifyRouteAccess(userId: number, route: string, method: string) {
  const connection = await db.getConnection("master");

  const query = `SELECT A.ID
                FROM API.API_USER_ROUTE_ACCESS A
                INNER JOIN API.ROUTES B ON B.ID = A.ROUTE_ID
                WHERE B.PATH = $1
                  AND B.METHOD = $2
                  AND A.USER_ID = $3`;

  const params = [route, method, userId];

  const { rows: verifiedRoute } = await connection.query(query, params);

  if (verifiedRoute.length) {
    const updateSql = buildUpdateWithWhereSql(
      "API.API_USER_ROUTE_ACCESS",
      { id: verifiedRoute[0].id },
      {
        lastAccessedAt: new Date(),
      }
    );

    await connection.query(updateSql.sql, updateSql.params);

    return true;
  }

  return false;
}
