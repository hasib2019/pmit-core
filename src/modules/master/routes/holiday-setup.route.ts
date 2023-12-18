import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import Container from "typedi";
import { HolidayInfoServices } from "../services/holiday.service";
import { auth } from "../../user/middlewares/auth.middle";
// import unique from "../middlewares/holiday-unique.middle";
import { getCode } from "../../../configs/auth.config";
import { holidaySetupValidator } from "../validators/holiday-setup.validator";
import {validates} from "../../../middlewares/express-validation.middle";
import holidaySetupMiddleware from "../middlewares/holiday-setup.middle";

const router: Router = express.Router();

router.get(
  "/allHolidayTypes",
  [auth(["*"])],
 
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const holidayInfoService: HolidayInfoServices =
      Container.get(HolidayInfoServices);
    const result = await holidayInfoService.getAllHolidayTypes();
    return res.status(200).json({
      message: "Request Successfull",
      data: result,
    });
  })
);
router.get(
  "/allHolidayInfoOfADoptor",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorId = req.user.doptorId;
    const holidayInfoService: HolidayInfoServices =
      Container.get(HolidayInfoServices);
    const result = await holidayInfoService.getAllHolidayInfoOfADoptor(
      doptorId
    );
    return res.status(200).json({
      message: "Request Successfull",
      data: result,
    });
  })
);

router.post(
  "/createHolidays",validates(holidaySetupValidator),
  [auth(["*"])], holidaySetupMiddleware,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const holidayInfoService: HolidayInfoServices =
      Container.get(HolidayInfoServices);
    req.body.doptorId = req.user.doptorId;
    const result = await holidayInfoService.createHolidays(
      req.body,
      req.user.doptorId
    );
    return res.status(201).json({
      message: "সফল ভাবে সংরক্ষণ হয়েছে",
      data: result ?? null,
    });
  })
);

router.put(
  "/updateHoliday/:id",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params.id);
    const holidayInfoService: HolidayInfoServices =
      Container.get(HolidayInfoServices);
    req.body.updatedAt = new Date();
    req.body.updatedBy = "ADMIN";
    const result = await holidayInfoService.updateHoliday(id, req.body);
    return res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে ",
      data: {
        id: result ?? null,
      },
    });
  })
);

export default router;
