/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-28 10:00:31
 * @modify date 2022-08-28 10:00:31
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import moment from "moment-timezone";
import { Pool, PoolClient } from "pg";
import { buildGetSql, buildInsertSql, buildUpdateSql } from "rdcd-common";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import { HolidayInfoServices } from "../../../modules/master/services/holiday.service";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";
import { IOpenDateAttrs } from "../interfaces/day-open-close.interface";
import { GLSummaryService } from "./gl-summary.service";
import { TransactionDailyService } from "./transaction-daily.service";

@Service()
export class DayOpenCloseService {
  constructor() {}

  async getOpenCloseFlagAndInserNewOpenDate(
    dateToOpen: Date,
    doptorId: number,
    officeId: number,
    userId: String,
    projectId?: number
  ) {
    const transaction = await db.getConnection("master").connect();
    const sql = `select open_close_flag, open_close_date from loan.day_open_close where
     doptor_id = $1 and office_id = $2  
     ${projectId ? " and project_id = $3" : ""} `;
    try {
      const { rows: openCloseFlagsAndDate } = await transaction.query(
        sql,
        projectId ? [doptorId, officeId, projectId] : [doptorId, officeId]
      );
      if (openCloseFlagsAndDate.length > 0) {
        for (const flag of openCloseFlagsAndDate) {
          if (flag.open_close_flag == true) {
            throw new BadRequestError(
              `${
                projectId
                  ? "এই প্রজেক্টের ইতমধ্যে একটি দিন ওপেন আছে । দয়া করে সেই দিনটি আগে ক্লোজ করুন"
                  : "এই অফিসের ইতমধ্যে একটি দিন ওপেন আছে । দয়া করে সেই দিনটি আগে ক্লোজ করুন"
              }`
            );
          }
          if (moment(flag.open_close_date).format("MM/DD/YYYY") == moment(dateToOpen).format("MM/DD/YYYY")) {
            throw new BadRequestError("এই দিনটি ইতিপূর্বে ওপেন করা হয়েছিল");
          }
        }
      }

      const insertNewOpenDateQuery = buildInsertSql(
        "loan.day_open_close",

        {
          openCloseDate: moment(dateToOpen).toDate(),
          openCloseFlag: true,
          oodBy: userId,
          oodTime: moment(new Date()).toDate(),
          createdBy: userId,
          createdAt: moment(new Date()).toDate(),
          doptorId: doptorId,
          officeId: officeId,
          ...(projectId && { projectId: projectId }),
        }
      );

      const insertResult = await transaction.query(insertNewOpenDateQuery.sql, insertNewOpenDateQuery.params);
      return insertResult.rows[0].id;
    } catch (error: any) {
      const errorMessage = error.toString().split(":");
      const message = errorMessage[errorMessage.length - 1];

      throw new BadRequestError(message);
    }
  }

  async getOpenDate(
    openCloseDate: Date | undefined,
    doptorId: number,
    officeId: number,
    projectId: number,
    transaction: PoolClient | Pool
  ): Promise<{ id: number; openCloseDate: Date } | undefined> {
    if (!doptorId || !officeId) return undefined;

    const { queryText, values } = buildGetSql(["id", "open_close_date"], "loan.day_open_close", {
      openCloseFlag: true,
      projectId,
      doptorId,
      officeId,
      ...(openCloseDate && { openCloseDate: openCloseDate }),
    });
    const queryTextWhenProjectIsUndefined = `SELECT id , open_close_date
     FROM loan.day_open_close WHERE open_close_flag= $1  AND project_id is null
     AND doptor_id= $2
     AND office_id= $3 ${openCloseDate ? "AND open_close_date= $4" : ""}   `;

    const {
      rows: [closeDay],
    } = await transaction.query(
      projectId ? queryText : queryTextWhenProjectIsUndefined,
      projectId ? values : openCloseDate ? [true, doptorId, officeId, openCloseDate] : [true, doptorId, officeId]
    );

    return closeDay ? (toCamelKeys(closeDay) as { id: number; openCloseDate: Date }) : undefined;
  }

  async dayClose(
    openCloseDate: Date,
    eodBy: string,
    oodBy: string,
    projectId: number,
    officeId: number,
    doptorId: number,
    userId: number
  ) {
    // const transaction = await db.getConnection("master").connect();
    const pool = await db.getConnection("master");
    const date = new Date();
    const eodTime = date;

    let oodTime = moment(date).toDate();

    let openDate = undefined;

    try {
      const closeDay = await this.getOpenDate(openCloseDate, doptorId, officeId, projectId, pool);

      // return early
      if (!closeDay) {
        throw new BadRequestError(
          `এই দিনটি (${numberToWord(moment(openCloseDate).format("DD-MM-YYYY"))}) ইতিপূর্বে বন্ধ করা হয়েছে`
        );
        // return {
        //   projectId,
        //   success: false,
        //   message: "Open date not found",
        //   CurrentOpenDate: openDate,
        // };
      }

      openDate = closeDay.openCloseDate;

      //check daily transaction is balanced
      const transactionDailyService = Container.get(TransactionDailyService);
      // const dailyTransactionIsBalanced =
      //   await transactionDailyService.dailyTransactionIsBalanced(
      //     doptorId,
      //     officeId,
      //     projectId,
      //     openDate,
      //     transaction
      //   );

      // if (!dailyTransactionIsBalanced) {
      //   await transaction.query("ROLLBACK");
      //   throw new BadRequestError("দৈনিক লেনদেন সামঞ্জস্যপূর্ণ নয়");
      //   return {
      //     projectId,
      //     success: false,
      //     message: "Daily transaction is not Balanced",
      //     CurrentOpenDate: openDate,
      //   };
      // }
      //daily transaction check end

      //gr summary

      // function delay(time: any) {
      //   return new Promise((resolve) => setTimeout(resolve, time));
      // }
      const glSummary = await (
        await transactionDailyService.getGLSummary(doptorId, officeId, projectId, openDate, pool)
      ).filter((gl) => gl.glacId !== null);
      // delay(60000);
      //upsert gl summary in summary table
      const glSummaryService = Container.get(GLSummaryService);
      // setTimeout(() => {
      //   console.log("I am waiting");
      // }, 60000);
      for await (const gl of glSummary) {
        const transaction = await db.getConnection("master").connect();

        try {
          transaction.query("BEGIN");
          await glSummaryService.upsertSummary(
            {
              doptorId,
              officeId,
              projectId,
              tranDate: openDate,
              glacId: gl.glacId,
              debitAmt: gl.drBalance,
              creditAmt: gl.crBalance,
            },
            eodBy,
            transaction
          );
          //check detail transaction is balanced
          // const transactionDetailService = Container.get(TransactionDetailService);
          // const detailTransactionIsBalanced =
          //   transactionDetailService.detailTransactionIsBalanced(
          //     doptorId,
          //     officeId,
          //     projectId,
          //     transaction
          //   );

          // if (!detailTransactionIsBalanced) {
          //   await transaction.query("ROLLBACK");
          //   throw new BadRequestError("বিস্তারিত লেনদেন সামঞ্জস্যপূর্ণ নয়");
          //   // return {
          //   //   projectId,
          //   //   success: false,
          //   //   message: "Detail transaction is not Balanced",
          //   //   CurrentOpenDate: openDate,
          //   // };
          // }
          //detail transaction check end

          //transfer daily transaction to detail transaction
          await transactionDailyService.dailyTransactionToDetailTransaction(gl.transactionIds, transaction);

          //delete transaction daily
          await transactionDailyService.deleteDailyTransaction(gl.transactionIds, transaction);
          transaction.query("COMMIT");
        } catch (error: any) {
          transaction.query("ROLLBACK");
          console.log(error);
          throw new BadRequestError("error");
        } finally {
          transaction.release();
        }
      }

      if (closeDay) {
        const closeDayQuery = buildUpdateSql(
          "loan.day_open_close",
          closeDay.id,
          { eodBy, eodTime, openCloseFlag: false },
          "id"
        );

        const test = await pool.query(closeDayQuery.sql, closeDayQuery.params);

        const holidayService = Container.get(HolidayInfoServices);
        const nextWorkingDay = await holidayService.nextWorkingDay({
          date: moment(closeDay.openCloseDate),
          doptorId,
          officeId,
        });

        if (nextWorkingDay) {
          if (!projectId) {
            const openDatesOfUerWiseProject = await this.getCurrentOpenDay(userId, doptorId, officeId);

            if (openDatesOfUerWiseProject.length > 0) {
              let projectNamesBangla = ``;
              for (let projectAndUserWiseOpenDate of openDatesOfUerWiseProject) {
                projectNamesBangla = projectAndUserWiseOpenDate.projectNameBangla + "," + "" + projectNamesBangla;
              }
              throw new BadRequestError(`আগে প্রজেক্টের (${projectNamesBangla}) ডে ক্লোজ করুন`);

              // return {
              //   success: false,
              //   message: "Project Under This Office Are Open So You Cant Close",
              //   CurrentOpenDate: openDate,
              // };
            }
          }

          const countEntryByDateInDayOpenCloseSql = `select count(id) from loan.day_open_close
           where open_close_date = $1`;
          const countEntryByDateInDayOpenCloseResult = await (
            await pool.query(countEntryByDateInDayOpenCloseSql, [moment(nextWorkingDay).format("YYYY-MM-DD")])
          ).rows[0];

          if (countEntryByDateInDayOpenCloseResult.count > 0) {
            return {
              isNextDayClosed: false,
              success: true,
              message: `আপনার প্রদত্ত দিনটি বন্ধ করা হয়েছে কিন্তু পরবর্তী দিনটি বন্ধ থাকায় ওপেন করা হয়নি`,
            };
          }
          const openDayQuery = buildInsertSql(
            "loan.day_open_close",

            {
              openCloseDate: moment(nextWorkingDay).toDate(),
              openCloseFlag: true,
              oodBy: oodBy,
              oodTime: oodTime,
              createdBy: oodBy,
              createdAt: oodTime,
              doptorId: doptorId,
              officeId: officeId,
              projectId: projectId,
            }
          );

          await pool.query(openDayQuery.sql, openDayQuery.params);

          // const openDayIdQuery = buildGetSql(["id"], "loan.day_open_close", {
          //   openCloseDate: nextWorkingDay.toDate(),
          //   projectId,
          //   doptorId,
          //   officeId,
          // });

          // const {
          //   rows: [openDay],
          // } = await transaction.query(
          //   openDayIdQuery.queryText,
          //   openDayIdQuery.values
          // );

          // if (openDay) {
          //   const openDayQuery = buildUpdateSql(
          //     "loan.day_open_close",
          //     openDay.id,
          //     { oodBy, oodTime, openCloseFlag: true },
          //     "id"
          //   );

          //   const {
          //     rows: [updatedOpenDate],
          //   } = await transaction.query(openDayQuery.sql, openDayQuery.params);
          //   openDate = updatedOpenDate.open_close_date;
          // } else {
          //   await transaction.query("ROLLBACK");
          //   return {
          //     projectId,
          //     success: false,
          //     message: "Open date not found",
          //     CurrentOpenDate: openDate,
          //   };
          // }
        } else {
          throw new BadRequestError("পরবর্তী কাজের তারিখ পাওয়া যায়নি");

          // return {
          //   projectId,
          //   success: false,
          //   message: "Next working date not found",
          //   CurrentOpenDate: openDate,
          // };
        }
      }

      return {
        projectId,
        success: true,
        message: "Success",
        CurrentOpenDate: openDate,
      };
    } catch (error: any) {
      // console.log(error);
      const msg = error.toString().split(":");
      throw new BadRequestError(msg[1]);

      // return {
      //   projectId,
      //   success: false,
      //   message: "Transaction rollback due to error",
      //   errorMessage: error,
      // };
    } finally {
    }
  }

  async getCurrentOpenDay(userId: number, doptorId: number, officeId: number): Promise<IOpenDateAttrs[]> {
    const query = `
    select 
        b.open_close_date,
        b.open_close_flag,
        b.id as open_close_id,
        b.project_id,
        b.id,
        b.office_id,
        c.project_name, 
        c.project_name_bangla 
    from master.user_wise_project a 
    inner join 
        loan.day_open_close b on a.project_id = b.project_id
    inner join 
        master.project_info c on c.id = a.project_id
    where 
        a.user_id = $1 and 
        a.doptor_id = $2 and
        a.is_active = true and 
        b.open_close_flag=true and
        b.office_id = $3
    `;

    const params = [userId, doptorId, officeId];

    const connection = db.getConnection("master");
    const { rows: data } = await connection.query(query, params);

    return toCamelKeys(data) as IOpenDateAttrs[];
  }
  async getCurrentOpenDayOfAOffice(officeId: number) {
    const query = `
		select a.open_close_date,a.open_close_flag, b.name_bn from loan.day_open_close a
		inner join master.office_info b on a.office_id = b.id where a.office_id = $1
		and a.open_close_flag = true and a.project_id is null
    `;

    const params = [officeId];

    const connection = db.getConnection("slave");
    const { rows: data } = await connection.query(query, params);

    return toCamelKeys(data);
  }
  async getOpenDateWithOrWithotProject(officeId: Number, projectId?: Number | null) {
    const dbConnection = db.getConnection("slave");
    const sql = `select open_close_date from loan.day_open_close where office_id = $1 
    and open_close_flag =true ${projectId ? "and project_id = $2" : "and project_id is null"} `;
    const queryResult = (await dbConnection.query(sql, projectId ? [officeId, projectId] : [officeId])).rows[0];
    const open_close_date = queryResult?.open_close_date;
    return open_close_date ? open_close_date : null;
  }
}
