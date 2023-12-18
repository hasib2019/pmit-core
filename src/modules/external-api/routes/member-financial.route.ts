import { NextFunction, Request, Response, Router } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { authExternalAPI } from "../middlewares/api-user-auth.middleware";
import MemberFinancialServices from "../services/member-financial.service";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { externalCustomerFinancialApiValidator } from "../validators/external-member-financial.validator";
const router = Router();

router.get(
  "/info",
  [authExternalAPI, validates(externalCustomerFinancialApiValidator, true)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["api-key"] || req.query.apiKey || req.body.apiKey;
    const originalRoutePath = req.originalUrl.split("?")[0];
    const memberFinancialServices: MemberFinancialServices = Container.get(MemberFinancialServices);

    const memberFinancialInfo = await memberFinancialServices.getCustomerFinancialInfo(
      { query: req.query, param: req.params, body: req.body },
      Number(req.query.officeId),
      Number(req.query.originSamityId),
      apiKey,
      originalRoutePath
    );

    return res.status(200).json({
      message: "Request Successful",
      data: memberFinancialInfo,
    });
  })
);

export { router as memberFinancialRouter };
