/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-03-21 13:02:28
 * @modify date 2022-03-21 13:02:28
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import moment from "moment-timezone";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import {
  Days,
  GracePeriodType,
  InstallmentType,
  InterestType,
  ScheduleAttrs,
} from "../../../modules/schedule/interfaces/schedule.interface";
import ServiceChargeService from "../services/service-charge.service";
import { validateServiceCharge } from "../validators/service-charge.validator";

const router = Router();

/**
 * service charge calculator router
 * @GET /service-charge
 * @query principal
 * @query
 */
router.get(
  "/",
  [validates(validateServiceCharge, true)],
  wrap(async (req: Request<unknown, unknown, unknown, ScheduleAttrs>, res: Response, next: NextFunction) => {
    const {
      principal,
      loanTerm: time,
      rate,
      interestType,
      gracePeriodType,
      gracePeriod,
      doptorId,
      officeId,
      holidayEffect,
      roundingType,
      roundingValue,
    } = req.query;
    const type = (interestType || "F") as InterestType;
    const installmentType = (req.query.installmentType || "M") as InstallmentType;
    const installmentNumber = req.query.installmentNumber;
    const disbursementDate = (req.query.disbursementDate as unknown)
      ? moment(req.query.disbursementDate as unknown as string, "YYYY-MM-DD")
      : moment();

    const meetingDay = req.query.meetingDay as unknown as Days;
    const weekPosition = req.query.weekPosition as unknown as number;

    const vGracePeriodType = (gracePeriodType || "NO") as GracePeriodType;
    const vGracePeriod = Number(gracePeriod) || 0;
    const vRoundingValue = roundingValue || 5;

    const serviceCharge = Container.get(ServiceChargeService);

    const data = await serviceCharge.get(
      Number(principal),
      Number(time),
      Number(rate),
      type,
      Number(installmentNumber),
      installmentType,
      disbursementDate,
      vGracePeriodType,
      vGracePeriod,
      meetingDay,
      weekPosition,
      doptorId,
      officeId,
      holidayEffect,
      roundingType,
      vRoundingValue
    );

    res.status(200).send({
      message: "Request successful",
      data,
    });
  })
);

export { router as serviceChargeRouter };
