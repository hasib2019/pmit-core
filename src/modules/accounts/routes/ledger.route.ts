import express, { NextFunction, Request, Response, Router } from "express";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { pageCheck } from "../../../middlewares/page-check.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { LedgerService } from "../services/ledger.service";
import { createGlValidator } from "../validators/create-gl.validator";
import { validateSubGl } from "../validators/create-subgl.validator";

const router: Router = express.Router();

/**
 * Get All gl accounts
 * Author: Adnan
 * Updater:
 * authId:
 */

router.post(
  "/createSubGl",
  [auth(["*"])],
  validates(validateSubGl),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    const data = req.body;

    const result: any = await ledgerService.createSubGl(Number(req.user.userId), data);
    return res.status(201).json({
      message: "সফলভাবে তৈরী হয়েছে",
      data: result?.id,
    });
  })
);
router.post(
  "/createGl",
  [auth(["*"])],
  validates(createGlValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    const data = req.body;
    data.doptorId = req.user.doptorId;
    data.officeId = req.user.officeId;
    data.authorizeStatus = "N";
    data.createdBy = req.user.userId;
    data.createdAt = new Date();
    const result: any = await ledgerService.createGl(data);
    res.status(201).json({
      message: "সফলভাবে তৈরী হয়েছে",
      data: {
        id: result?.id ?? null,
      },
    });
  })
);

router.put(
  "/updateGl/:id",
  [auth(["*"])],
  validates(createGlValidator, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const data = req.body;
    data.updatedBy = req.user.userId;
    data.updatedAt = new Date();
    const ledgerService: LedgerService = Container.get(LedgerService);
    const updateData: any = await ledgerService.updateGl(data, parseInt(id));
    res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে ",
      data: {
        id: updateData?.id ?? null,
      },
    });
  })
);
// router.put("/:id", [auth(["*"])], )
router.get(
  "/getGlList",
  [auth(["*"])],
  pageCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ledgerService: LedgerService = Container.get(LedgerService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;

    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
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
    if (req.query.subGlType) result = await ledgerService.getSubGlInfo(Number(req.query.subGlType));
    else result = await ledgerService.getSubGlInfo();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export { router as ledgerRouter };
