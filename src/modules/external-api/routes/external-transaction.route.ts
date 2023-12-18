import { NextFunction, Request, Response, Router } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { authExternalAPI } from "../middlewares/api-user-auth.middleware";
import Container from "typedi";
import ExternalTransactionServices from "../services/external-transaction.service";
import { validates } from "../../../middlewares/express-validation.middle";
import { externalTransactionApiValidator } from "../validators/external-transaction.validator";
const router = Router();

router.post(
  "/create",
  [authExternalAPI],
  validates(externalTransactionApiValidator, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["api-key"] || req.query.api_key || req.body.api_key;
    const originalRoutePath = req.originalUrl.split("?")[0];
    const externalTransactionServices: ExternalTransactionServices = Container.get(ExternalTransactionServices);

    const transactionResponse = await externalTransactionServices.createExternalTransactions(
      { query: req.query, param: req.params, body: req.body },
      req.body.transactionSets,
      apiKey,
      originalRoutePath
    );

    return res.status(200).json({
      message: "Request Successful",
      data: transactionResponse,
    });
  })
);

export { router as externalTransactionRouter };
