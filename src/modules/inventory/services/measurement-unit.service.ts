import { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { MeasurementUnitAttributes } from "../interfaces/measurement-unit.interface";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";

@Service()
export class MeasurementUnitService {
  constructor() {}

  async createMeasurementUnit(measurementUnitData: MeasurementUnitAttributes) {
    const { mouName, isActive, createdBy, createdAt } = measurementUnitData;
    try {
      const connection = db.getConnection("master");
      const { sql, params } = buildInsertSql("inventory.measurement_unit", { ...measurementUnitData });
      const queryResult = (await connection.query(sql, [mouName, isActive, createdBy, createdAt])).rows[0];
      return toCamelKeys(queryResult);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async updateMeasurementUnit(measurementUnitData: MeasurementUnitAttributes, id: number) {
    try {
      const connection = db.getConnection("master");
      const updateHistory = await compareTwoObjectAndMakeUpdateHistory(
        "inventory.measurement_unit",
        measurementUnitData,
        id
      );
      measurementUnitData.updateHistory = updateHistory;
      const { sql, params } = buildUpdateSql("inventory.measurement_unit", id, measurementUnitData, "id");
      const queryResult = (await connection.query(sql, params)).rows[0];
      return toCamelKeys(queryResult);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  async isMeasurementUnitDuplicate(mouName: String, id?: number) {
    const connection = db.getConnection("slave");
    try {
      const sql = `select count(id) from inventory.measurement_unit where mou_name = $1 ${id ? "and id <> $2" : ""}`;
      const result = (await connection.query(sql, id ? [mouName, id] : [mouName])).rows[0]?.count;
      return result > 0 ? true : false;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
}
