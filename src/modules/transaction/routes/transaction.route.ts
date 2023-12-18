import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { validates } from "../../../middlewares/express-validation.middle";
import Container from "typedi";
import TransactionService from "../services/transaction.service";
import { auth } from "../../user/middlewares/auth.middle";
import { getCode } from "../../../configs/auth.config";
import { validateTransaction } from "../validators/transaction.validator";
import { ReverseTranService } from "../services/reverse.service";
import moment from "moment-timezone";

const router: Router = express.Router();

/**
 * create new transaction
 * Author: Adnan
 * Updater:
 * authId:
 */
router.post(
  "/",
  [auth(["*"])],
  validates(validateTransaction),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const transactionService: TransactionService = Container.get(TransactionService);
    const result = await transactionService.create({
      ...req.body,
      tranType: "CASH",
      doptorId: req.user.doptorId,
      officeId: req.user.officeId,
      createdBy: req.user.userId,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "সফলভাবে টাকা জমা/ ঋণের কিস্তি পরিশোধ করা হয়েছে",
      data: result,
    });
  })
);

/**
 * Get product list
 * Author: Rukaiya
 * Updater: Adnan
 */
router.get(
  "/product",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const transactionService: TransactionService = Container.get(TransactionService);
    const result = await transactionService.getProductList(
      Number(req.user.doptorId),
      Number(req.user.officeId),
      Number(req.query.projectId),
      Number(req.query.samityId)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
// for reverse request data details
router.get(
  "/reverse-requst-info",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const reverseService: ReverseTranService = Container.get(ReverseTranService);
    const result = await reverseService.reverseRequstInfo(
      Number(req.user.doptorId),
      Number(req.user.officeId),
      String(req.query.tranNumber),
      moment(req.query.tranDate as string, "DD/MM/YYYY")
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
