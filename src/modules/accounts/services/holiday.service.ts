/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-04 11:40:16
 * @modify date 2022-06-04 11:40:16
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import _, { isNil, omitBy } from "lodash";
import moment, { Moment } from "moment-timezone";
import { Pool, PoolClient } from "pg";
import { BadRequestError, buildGetSql, buildInsertSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { HolidaySetupPayloadAttrs } from "../interfaces/holiday-setup.interface";

@Service()
export class HolidayInfoServices {
  constructor() { }

  async isHoliday({ date, doptorId, officeId }: { date: Moment; doptorId?: number; officeId?: number }) {
    const vDate = date.toDate();
    const queryConditions = {
      holiday: vDate,
      isActive: true,
      doptorId,
      officeId,
    };
    const filteredObj = omitBy(queryConditions, isNil);

    const { queryText, values } = buildGetSql(["id"], "master.holiday_info", filteredObj);

    const { rows: holiday } = await db.getConnection("slave").query(queryText, values);

    return holiday.length !== 0;
  }

  async getAllHolidayTypes() {
    const pool = await db.getConnection("slave");
    const sql = `select * from master.holiday_type`;
    const allHolidayTypes = await (await pool.query(sql)).rows;

    return toCamelKeys(allHolidayTypes);
  }

  async getAllHolidayInfoOfADoptor(doptorId: number) {
    const pool = await db.getConnection("slave");
    const sql = `select a.*, b.name_bn from master.holiday_info a inner join master.office_info b on a.office_id = b.id where a.doptor_id = $1 order by id desc`;
    const allHolidayInfoOfADoptor = await (await pool.query(sql, [doptorId])).rows;
    return toCamelKeys(allHolidayInfoOfADoptor);
  }

  async createHolidayAccordingToDifferenceOfFromAndToDate(
    data: HolidaySetupPayloadAttrs,
    transaction: PoolClient,
    officeId: number | null
  ) {
    const fromDate = new Date(data.fromDate);

    const toDate = new Date(data.toDate);
    const differenceInMiliseconds = toDate.getTime() - fromDate.getTime();
    const differenceInDays = Math.ceil(differenceInMiliseconds / (1000 * 3600 * 24));

    const requestBodyWithoutFromToDate = _.omit(data, "fromDate", "toDate");

    const result: number[] = [];
    for (let day = 0; day <= differenceInDays; day++) {
      const date = new Date(fromDate.setDate(fromDate.getDate() + day));
      requestBodyWithoutFromToDate.dayName = moment(date).format("dddd").toUpperCase();
      requestBodyWithoutFromToDate.holiday = moment(date).format("YYYY-MM-DD");
      if (officeId) {
        requestBodyWithoutFromToDate.officeId = officeId;
      }
      const updateId = await (
        await this.checkUniqueHoliday(
          data.officeId,
          data.doptorId,

          requestBodyWithoutFromToDate.holiday
        )
      )?.id;
      const { sql, params } = buildInsertSql("master.holiday_info", requestBodyWithoutFromToDate);

      if (updateId) {
        const updateEntry = await await this.updateHoliday(updateId, requestBodyWithoutFromToDate);
        result.push(updateEntry);
      } else {
        const holidayEntry = await (await transaction.query(sql, params)).rows[0].id;

        result.push(holidayEntry);
      }
    }

    return result;
  }

  async getAllOfficeOfADoptor(pool: PoolClient, doptorId: number) {
    const doptorWiseOfficeSql = `select id from master.office_info where doptor_id = $1`;

    const doptorWiseOffices = await (await pool.query(doptorWiseOfficeSql, [doptorId])).rows;

    return doptorWiseOffices;
  }

  async checkUniqueHoliday(
    officeId: number,
    doptorId: number,

    holiday: String
  ) {
    const pool = await db.getConnection("slave");

    const uniqueHolidayCheckSql = `select id, holiday_type from master.holiday_info where
       doptor_id =$1 and holiday = $2 and office_id =$3 `;

    const uniqueHoliday = await (await pool.query(uniqueHolidayCheckSql, [doptorId, holiday, officeId])).rows[0];

    return uniqueHoliday;
  }

  async updateHoliday(id: number, data: any) {
    const pool = await db.getConnection("master");
    // data.holiday = moment(data.fromDate).format("YYYY-MM-DD");

    // const dataWithoutFromAndToDate = _.omit(data, "fromDate", "toDate");
    const { sql, params } = buildUpdateSql("master.holiday_info", id, data, "id");

    const updateHoliday = await (await pool.query(sql, params)).rows[0];

    return updateHoliday.id;
  }
  async determineGivenDayNumber(holidayType: String, pool: PoolClient | Pool) {
    // switch(holidayType)
    const sql = `select holiday_type, weekend_day from master.holiday_type where holiday_type = $1  `;
    const weekenInfo = await (await pool.query(sql, [holidayType])).rows[0];
    const dayName = weekenInfo.weekend_day.toUpperCase();
    switch (dayName) {
      case "SATURDAY":
        return 6;
      case "SUNDAY":
        return 0;
      case "MONDAY":
        return 1;
      case "TUESDAY":
        return 2;
      case "WEDNESDAY":
        return 3;
      case "THURSDAY":
        return 4;
      case "FRIDAY":
        return 5;
    }
  }
  async chekGivenDateRangeHaveWeekendDay(startDate: Date, endDate: Date, holidayType: String) {
    const pool = await db.getConnection("slave");
    if (holidayType === "WEK1" || holidayType === "WEK2") {
      let weekendArray = [];
      let fromDate = new Date(startDate);
      let toDate = new Date(endDate);
      const givenDay = await this.determineGivenDayNumber(holidayType, pool);
      while (fromDate <= toDate) {
        if (fromDate.getDay() === givenDay) {
          weekendArray.push(moment(fromDate).format("dddd").toUpperCase());
        }
        fromDate.setDate(fromDate.getDate() + 1);
      }
      const dayName = await this.determineDayNameAccordingToHolidayType(holidayType, pool);

      if (weekendArray.includes(dayName)) {
        return true;
      } else {
        return false;
      }
    }
  }

  async determineDayNameAccordingToHolidayType(holidayType: String, pool: PoolClient | Pool) {
    const sql = `select holiday_type, weekend_day from master.holiday_type where holiday_type = $1  `;
    const weekenInfo = await (await pool.query(sql, [holidayType])).rows[0];
    const dayName = weekenInfo.weekend_day.toUpperCase();
    return dayName;
  }
  async createHolidays(data: HolidaySetupPayloadAttrs, doptorId: number) {
    const transaction = await db.getConnection("master").connect();

    data.createdBy = "ADMIN";
    data.createdAt = new Date();
    try {
      transaction.query("BEGIN");
      if (data.holidayType === "WEK1" || data.holidayType === "WEK2") {
        let startDate = new Date(data.fromDate);
        let endDate = new Date(data.toDate);
        const givenDay = await this.determineGivenDayNumber(data.holidayType, transaction); // 0 for sunday, 1 for monday and so on

        let result = [];
        let fridays = [];
        const requestBodyWithoutFromToDate = _.omit(data, "fromDate", "toDate");

        const differenceInMiliseconds = endDate.getTime() - startDate.getTime();
        const differenceInDays = Math.ceil(differenceInMiliseconds / (1000 * 3600 * 24));

        if (differenceInDays === 0) {
          const dayName = await this.determineDayNameAccordingToHolidayType(data.holidayType, transaction);
          const dayNameOfGivenDay = moment(startDate).format("dddd").toUpperCase();
          if (dayNameOfGivenDay === dayName) {
            requestBodyWithoutFromToDate.dayName = dayNameOfGivenDay;
            requestBodyWithoutFromToDate.holiday = moment(startDate).format("YYYY-MM-DD");
            const updateId = await (
              await this.checkUniqueHoliday(
                requestBodyWithoutFromToDate.officeId,
                requestBodyWithoutFromToDate.doptorId,

                requestBodyWithoutFromToDate.holiday
              )
            )?.id;
            const { sql, params } = buildInsertSql("master.holiday_info", requestBodyWithoutFromToDate);

            if (!updateId) {
              const holidayEntry = await (await transaction.query(sql, params)).rows[0].id;

              result.push(holidayEntry);
              fridays.push(startDate);
            }
          }
        }

        if (differenceInDays > 0) {
          while (startDate <= endDate) {
            if (startDate.getDay() === givenDay) {
              requestBodyWithoutFromToDate.dayName = moment(startDate).format("dddd");
              requestBodyWithoutFromToDate.holiday = moment(startDate).format("YYYY-MM-DD");

              const updateId = await (
                await this.checkUniqueHoliday(
                  requestBodyWithoutFromToDate.officeId,
                  requestBodyWithoutFromToDate.doptorId,

                  requestBodyWithoutFromToDate.holiday
                )
              )?.id;

              if (data.officeId === 0) {
                const doptorWiseOffices = await this.getAllOfficeOfADoptor(transaction, doptorId);

                for (let i = 0; i < doptorWiseOffices.length; i++) {
                  const { sql, params } = buildInsertSql("master.holiday_info", {
                    ...requestBodyWithoutFromToDate,
                    officeId: parseInt(doptorWiseOffices[i].id),
                  });
                  if (!updateId) {
                    const holidayEntry = await (await transaction.query(sql, params)).rows[0].id;

                    result.push(holidayEntry);
                    fridays.push(startDate);
                  }
                }
              } else {
                const { sql, params } = buildInsertSql("master.holiday_info", requestBodyWithoutFromToDate);

                if (!updateId) {
                  const holidayEntry = await (await transaction.query(sql, params)).rows[0].id;

                  result.push(holidayEntry);
                  fridays.push(startDate);
                }
              }
            }

            startDate.setDate(startDate.getDate() + 1);
          }
        }
        transaction.query("COMMIT");

        return result;
      } else {
        if (data.officeId === 0) {
          let bulkInsert;

          const doptorWiseOffices = await this.getAllOfficeOfADoptor(transaction, doptorId);

          for (let i = 0; i < doptorWiseOffices.length; i++) {
            bulkInsert = await this.createHolidayAccordingToDifferenceOfFromAndToDate(
              data,
              transaction,
              doptorWiseOffices[i].id
            );
          }
          transaction.query("COMMIT");
          return bulkInsert;
        } else {
          const result = await this.createHolidayAccordingToDifferenceOfFromAndToDate(data, transaction, null);
          transaction.query("COMMIT");
          return result;
        }
      }
    } catch (error: any) {

      transaction.query("ROLLBACk");
      throw new BadRequestError(error.toString());
    } finally {
      transaction.release();
    }
  }
  async nextWorkingDay({ date, doptorId, officeId }: { date: Moment; doptorId?: number; officeId?: number }) {
    let vDate = moment(date);
    let isHoliday = false;
    do {
      vDate.add(1, "day");
      isHoliday = await this.isHoliday({ date: vDate, doptorId, officeId });
    } while (isHoliday);

    return vDate;
  }
}
