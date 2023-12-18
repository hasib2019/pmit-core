import { toCamelKeys, toSnakeCase } from "keys-transform";
import lodash from "lodash";
import moment from "moment-timezone";
import { Pool, PoolClient } from "pg";
import Container, { Container as typeDiCotainer, Service } from "typedi";
import db from "../../../db/connection.db";
import { TransactionApplicationService } from "../../application/services/transaction-application.service";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { IMakeRepaymentSequence, ITransactionAttrs } from "../interfaces/transaction.interface";
import { DayOpenCloseService } from "./day-open-close.service";
import DpsService from "../../savings/services/dps.service";
import { BadRequestError } from "rdcd-common";

@Service()
export default class TranDocGenerationService {
  constructor() {}
  async leftPadding(number: any, length: any) {
    let len = length - ("" + number).length;
    return (len > 0 ? new Array(++len).join("0") : "") + number;
  }

  //generate transaction number
  async generateTransactionNumber(transaction: PoolClient) {
    const tranNumSql = `SELECT NEXTVAL('loan.tran_num_seq') tran_num`;
    const transactionNumber = `TR${await this.leftPadding((await transaction.query(tranNumSql)).rows[0].tran_num, 6)}`;
    return transactionNumber;
  }

  //generate Batch number
  async generateBatchNumber(transaction: PoolClient) {
    const batchNumSql = `SELECT NEXTVAL('loan.batch_num_seq') batch_num`;
    const batchNum = (await transaction.query(batchNumSql)).rows[0].batch_num;
    const batchNumber = `BH${await this.leftPadding(batchNum, 6)}`;
    return batchNumber;
  }
}
