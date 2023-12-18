import express, { NextFunction, Request, Response, Router } from "express";
import { Paginate } from "rdcd-common";
import { pageCheck } from "../../middlewares/page-check.middle";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../user/middlewares/auth.middle";
import { LedgerService } from "../../services/ledger/ledger.service";
import lodash from "lodash";
import { validates } from "../../../../middlewares/express-validation.middle";
// import { createGlValidator } from "../../validators/create-gl.validator";
import { body } from "express-validator";
const router: Router = express.Router();

/**
 * Get All gl accounts
 * Author: Adnan
 * Updater:
 * authId:
 */

router.get(
  "/getGlList",
  [auth(["*"])],
  pageCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;

    const isPagination =
      req.query.isPagination && req.query.isPagination == "false"
        ? false
        : true;
    allQuery;
    // delete allQuery.isPagination;
    // delete allQuery.page;
    // delete allQuery.limit;
    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);

    const count: number = await ledgerService.count(allQuery);
    const pagination = new Paginate(count, limit, page);
    const data = await ledgerService.getAllGl(
      Number(req.user.doptorId),
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery
    );

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);
/**
 * get Sub GL List
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/subGlData",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    let result;
    if (req.query.subGlType)
      result = await ledgerService.getSubGlInfo(Number(req.query.subGlType));
    else result = await ledgerService.getSubGlInfo();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
router.get(
  "/serCrgSegList",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    const result = await ledgerService.getSegregatioList(
      Number(req.user.doptorId)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get charge type list
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/chargeTypeList",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    const result = await ledgerService.getChargeTypes();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export { router as ledgerRouter };
