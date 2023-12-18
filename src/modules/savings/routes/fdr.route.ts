import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import FdrService from "../services/fdr.service";

const router: Router = express.Router();

router.get(
  "/fdr-accounts-details",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fdrService: FdrService = Container.get(FdrService);
    let result;
    result = await fdrService.getAccountDetails(Number(req.query.accountId));

    res.status(200).json({
      message: "request Successful",
      data: result,
    });
  })
);

export { router as fdrRouter };
