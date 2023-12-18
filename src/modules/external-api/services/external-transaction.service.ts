import { toCamelKeys } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { Container } from "typedi";
import ApiRequestLogServices from "./request-log.service";
import TransactionService from "../../transaction/services/transaction.service";
import { ITransactionAttrs } from "../../transaction/interfaces/transaction.interface";
import lodash from "lodash";

@Service()
export default class ExternalTransactionServices {
  constructor() {}

  async createExternalTransactions(
    requestData: { query: any; param: any; body: any },
    transactionSets: ITransactionAttrs[],
    apiKey: string,
    originalRoutePath: string
  ) {
    const transactionConnection = await db.getConnection().connect();
    const userAndServiceInfoSql = `SELECT 
                                    a.id service_id, 
                                    c.id user_id 
                                  FROM 
                                    api.routes a 
                                    INNER JOIN api.api_user_route_access b ON b.route_id = a.id 
                                    INNER JOIN users.api_users c ON c.id = b.user_id 
                                  WHERE 
                                    a.path = $1 
                                    AND c.api_key = $2`;
    const userAndServiceInfo = (await transactionConnection.query(userAndServiceInfoSql, [originalRoutePath, apiKey]))
      .rows[0];

    const apiRequestLogServices: ApiRequestLogServices = Container.get(ApiRequestLogServices);
    try {
      transactionConnection.query("BEGIN");
      //transaction event
      const transactionService: TransactionService = Container.get(TransactionService);
      const glCodeToIdSql = `SELECT id FROM loan.glac_mst WHERE glac_code = $1 AND doptor_id = $2`;
      for (let [index, singleTransactionSet] of transactionSets.entries()) {
        if (singleTransactionSet?.accountId) {
          throw new BadRequestError("সদস্যের অ্যাকাউন্টে ট্রান্সাকশনের অনুমতি নেই");
        }

        let glacId = (
          await transactionConnection.query(glCodeToIdSql, [singleTransactionSet.glCode, requestData.body.doptorId])
        ).rows[0]?.id;
        if (!glacId) throw new BadRequestError("প্রদত্ত জিএল কোড বিদ্যমান নেই");
        transactionSets[index] = {
          ...lodash.omit(singleTransactionSet, ["glCode"]),
          glacId,
          tranNum: await transactionService.generateTransactionNumber(transactionConnection),
          batchNum: await transactionService.generateBatchNumber(transactionConnection),
        };
      }
      const transactionResponse = await transactionService.generalTransactionEngine(
        requestData.body.doptorId,
        requestData.body.officeId,
        requestData.body.projectId ? requestData.body.projectId : 0,
        userAndServiceInfo?.user_id,
        null,
        transactionSets,
        transactionConnection
      );

      if (!userAndServiceInfo) throw new BadRequestError("এপিআই রিকুয়েস্টে অনুমতি নেই");
      const logData = {
        requestDate: new Date(),
        serviceType: userAndServiceInfo?.service_id,
        userId: userAndServiceInfo?.user_id,
        requestInfo: JSON.stringify(requestData),
        responseInfo: JSON.stringify(transactionResponse),
        requestStatus: "SUCCESS",
        resStatusCode: 200,
        errorMessage: null,
        createdBy: userAndServiceInfo?.service_id,
      };
      await apiRequestLogServices.createExternalApiRequestLog(transactionConnection, logData);
      transactionConnection.query("COMMIT");
      return transactionResponse;
    } catch (error: any) {
      //api request error log data
      const logData = {
        requestDate: new Date(),
        serviceType: userAndServiceInfo?.service_id,
        userId: userAndServiceInfo?.user_id,
        requestInfo: JSON.stringify(requestData),
        responseInfo: null,
        requestStatus: "FAIL",
        resStatusCode: error.statusCode || 500,
        errorMessage: error.message || "Internal Server Error",
        createdBy: userAndServiceInfo?.service_id,
      };
      await apiRequestLogServices.createExternalApiRequestLog(transactionConnection, logData);
      transactionConnection.query("ROLLBACK");
      throw error;
    } finally {
      transactionConnection.release();
    }
  }
}
