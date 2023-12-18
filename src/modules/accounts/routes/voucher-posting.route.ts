import express, { NextFunction, Request, Response, Router } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { VoucherPostingService } from "../services/voucher-posting.service";

const router: Router = express.Router();

router.post(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const VoucherPostService = Container.get(VoucherPostingService);
      const data = req.body;
      req.body.doptorId = req.user.doptorId;
      req.body.officeId = data?.data?.officeId;

      req.body.userId = req.user.userId;
      const result = await VoucherPostService.saveVoucher(req.body);

      return res.status(200).json({
        message: "সফলভাবে তৈরী হয়েছে",
        data: result,
      });
    } catch (ex: any) {
      const msg = ex.toString().split(":");
      throw new BadRequestError(msg[1]);
    }
  })
);

export { router as voucherRouter };
