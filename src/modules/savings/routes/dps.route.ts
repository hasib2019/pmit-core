import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import DpsService from "../services/dps.service";

const router: Router = express.Router();

/**
 * create dps application
 * Author: Tuhin
 * Updater:
 * authId:
 */

router.get(
  "/installmentAmount",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dpsService: DpsService = Container.get(DpsService);
    const result = await dpsService.getInstallmentAmounts(Number(req.query.productId));
    res.status(200).json({
      message: "request Successful",
      data: result,
    });
  })
);

router.get(
  "/interest-details",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dpsService: DpsService = Container.get(DpsService);
    let result;
    if (req.query.productInterestId) {
      result = await dpsService.getTime(
        Number(req.query.productId),
        Number(req.query.installmentAmount),
        Number(req.query.productInterestId)
      );
    } else {
      result = await dpsService.getTime(Number(req.query.productId), Number(req.query.installmentAmount));
    }
    res.status(200).json({
      message: "request Successful",
      data: result,
    });
  })
);

router.get(
  "/dps-accounts-details",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dpsService: DpsService = Container.get(DpsService);
    let result;
    result = await dpsService.getAccountDetails(Number(req.query.accountId));

    res.status(200).json({
      message: "request Successful",
      data: result,
    });
  })
);

export { router as dpsRouter };
