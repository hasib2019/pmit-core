import { Moment } from "moment-timezone";
import { Service } from "typedi";
import {
  Days,
  GracePeriodType,
  HolidayEffect,
  InstallmentType,
  InterestType,
  RoundingType,
} from "../../../modules/schedule/interfaces/schedule.interface";
import { DOCCustomScheduleCalculator } from "../../../modules/schedule/utils/doc-custom-schedule.util";
import { ScheduleCalculator } from "../../../modules/schedule/utils/schedule.util";

@Service()
export default class ServiceChargeService {
  constructor() {}

  async get(
    principal: number,
    time: number,
    rate: number,
    type: InterestType,
    installmentNumber: number,
    installmentType: InstallmentType,
    disbursementDate: Moment,
    gracePeriodType: GracePeriodType,
    gracePeriod: number,
    meetingDay?: Days,
    weekPosition?: number,
    doptorId?: number,
    officeId?: number,
    holidayEffect?: HolidayEffect,
    roundingType?: RoundingType,
    roundingValue?: number
  ) {
    let calLoan: DOCCustomScheduleCalculator | ScheduleCalculator;

    if (type == "DOC") {
      calLoan = new DOCCustomScheduleCalculator({
        principal: Number(principal),
        loanTerm: Number(time),
        rate: Number(rate),
        type,
        installmentNumber: Number(installmentNumber),
        installmentType,
        disbursementDate,
        gracePeriodType,
        gracePeriod,
        meetingDay,
        weekPosition,
        doptorId,
        officeId,
        holidayEffect,
        roundingType,
        roundingValue,
      });
    } else {
      calLoan = new ScheduleCalculator({
        principal: Number(principal),
        loanTerm: Number(time),
        rate: Number(rate),
        type,
        installmentNumber: Number(installmentNumber),
        installmentType,
        disbursementDate,
        gracePeriodType,
        gracePeriod,
        meetingDay,
        weekPosition,
        doptorId,
        officeId,
        holidayEffect,
        roundingType,
        roundingValue,
      });
    }

    const data = calLoan.get();
    const schedule = await calLoan.getSchedule();

    return { ...data, schedule };
  }
}
