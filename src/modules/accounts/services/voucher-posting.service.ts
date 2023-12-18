import { BadRequestError, buildUpdateSql } from "rdcd-common";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import TransactionService from "../../../modules/transaction/services/transaction.service";

@Service()
export class VoucherPostingService {
  constructor() { }

  async deleteVoucher(body: any) { }

  async saveVoucher(body: any) {
    const transaction = await db.getConnection("master").connect();

    try {
      transaction.query("BEGIN");
      const TransactionSv = Container.get(TransactionService);
      const tranNum = await TransactionSv.generateTransactionNumber(transaction);
      const batchNum = await TransactionSv.generateBatchNumber(transaction);
      for (let i = 0; i < body?.data.tranSets?.length; i++) {

        body.data.tranSets[i].tranNum = body.data.tranSets[0].officeId
          ? await TransactionSv.generateTransactionNumber(transaction)
          : tranNum;
        body.data.tranSets[i].batchNum = batchNum;
        body.data.tranSets[i].tranCode = "VOP";
        body.data.tranSets[i].isSelected && delete body.data.tranSets[i].isSelected;
      }


      const projectId = body?.data?.projectId ? body?.data?.projectId : null;
      const response = body.data.tranSets[0].officeId
        ? await TransactionSv.interOfficeTransactionEngine(
          parseInt(body.doptorId),
          parseInt(body.officeId),
          projectId,
          parseInt(body.userId),

          null,
          body.data.tranSets,
          transaction
        )
        : await TransactionSv.generalTransactionEngine(
          parseInt(body.doptorId),
          parseInt(body.officeId),
          projectId,
          parseInt(body.userId),
          null,
          body.data.tranSets,
          transaction
        );
      const { sql, params } = buildUpdateSql(
        "temps.transaction_application",
        body.data.id,
        { authorizeStatus: "A" },
        "id"
      );


      try {
        const result = await transaction.query(sql, params);

      } catch (error) {

      }

      transaction.query("COMMIT");


      return response;
    } catch (error: any) {

      transaction.query("ROLLBACK");
      throw new BadRequestError(error.message.toString().replace("Error:", ""));
    } finally {
      transaction.release();
    }
  }
}
