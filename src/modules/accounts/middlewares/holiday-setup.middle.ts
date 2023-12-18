import { NextFunction, Request, Response } from "express";
import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import { HolidayInfoServices } from "../services/holiday.service";

const holidaySetupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const holidaySetUpService: HolidayInfoServices = Container.get(HolidayInfoServices);
  const isDateRangeHaveHoliday = await holidaySetUpService.chekGivenDateRangeHaveWeekendDay(
    req.body.fromDate,
    req.body.toDate,
    req.body.holidayType
  );
  if (req.body.holidayType === "WEK1" || req.body.holidayType === "WEK2") {
    if (isDateRangeHaveHoliday === false) {
      next(new BadRequestError("আপনার প্রদত্ত তারিখ সীমার মধ্যে শুক্রবার অথবা শনিবার নেই"));
    } else {
      next();
    }
  } else {
    next();
  }

  //   const holidayType = req.body.holidayType;
  //   const officeId = req.body.officeId;
  //   const doptorId = req.user.doptorId;
  //   const holiday = moment(req.body.holiday).format("YYYY-MM-DD");
  //   const isUniqueHoliday = await holidaySetUpService.checkUniqueHoliday(
  //     officeId,
  //     doptorId,
  //     holidayType,
  //     holiday
  //   );

  //   console.log("isUnique",isUniqueHoliday);
};
export default holidaySetupMiddleware;
