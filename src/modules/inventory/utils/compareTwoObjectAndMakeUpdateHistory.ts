import { toSnakeCase } from "keys-transform";
import db from "../../../db/connection.db";

export const compareTwoObjectAndMakeUpdateHistory = async (tableName: String, payloadObject: any, id: number) => {
  const connection = db.getConnection("slave");
  const sql = `select * from ${tableName} where id = $1`;
  const databaseObject = (await connection.query(sql, [id])).rows[0];
  let updateHistoryArray = databaseObject.update_history ? databaseObject.update_history : [];
  delete databaseObject.createdBy;
  delete databaseObject.createdAt;
  if ("updated_at" in databaseObject) {
    delete databaseObject.updatedAt;
  }
  if ("updated_by" in databaseObject) {
    delete databaseObject.updatedBy;
  }
  if ("created_at" in databaseObject) {
    delete databaseObject.createdAt;
  }
  if ("created_by" in databaseObject) {
    delete databaseObject.createdBy;
  }
  if ("update_history" in databaseObject) {
    delete databaseObject.updateHistory;
  }
  if ("updatedAt" in payloadObject) {
    delete payloadObject.updatedAt;
  }
  if ("updatedBy" in payloadObject) {
    delete payloadObject.updatedBy;
  }
  if ("createdAt" in payloadObject) {
    delete payloadObject.createdAt;
  }
  if ("updatedAt" in payloadObject) {
    delete payloadObject.updatedAt;
  }
  if ("rules" in payloadObject) {
    delete payloadObject.groupId;
  }

  const beforeChanged: any = {};
  const afterChanged: any = {};
  Object.keys(payloadObject).forEach((key: any) => {
    if (payloadObject[key] != databaseObject[toSnakeCase(key)]) {
      afterChanged[key] = payloadObject[key];
      beforeChanged[key] = databaseObject[toSnakeCase(key)];
      if (
        key == "rules" &&
        JSON.stringify(payloadObject.rules.doptorIds) === JSON.stringify(databaseObject.rules.doptor_ids)
      ) {
        delete afterChanged.rules;
        delete beforeChanged.rules;
      }
    }
  });
  updateHistoryArray.push({
    beforeUpdate: beforeChanged,
    afterUpdate: afterChanged,
    updatedAt: new Date(),
  });
  if (Object.keys(beforeChanged).length == 0 && Object.keys(afterChanged).length == 0) {
    updateHistoryArray.pop();
  }
  return JSON.stringify(updateHistoryArray);
};
