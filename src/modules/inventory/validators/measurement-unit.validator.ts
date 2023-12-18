import { body } from "express-validator";
import Container from "typedi";
import { MeasurementUnitService } from "../services/measurement-unit.service";

export const measurementUnitValidator = [
  body("id")
    .exists()
    .withMessage("পরিমাপের এককের আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("পরিমাপের এককের আইডি প্রদান করুন")
    .isInt()
    .withMessage("পরিমাপের এককের আইডি অবশ্যই নাম্বার হতে হবে")
    .optional(),
  body("unitName")
    .exists()
    .withMessage("পরিমাপের এককের নাম প্রদান করুন")
    .notEmpty()
    .withMessage("পরিমাপের এককের নাম প্রদান করুন")
    .custom(async (value, { req }) => {
      const measurementUnitService: MeasurementUnitService = Container.get(MeasurementUnitService);
      const isDuplicate = await measurementUnitService.isMeasurementUnitDuplicate(value, req.body?.id);
      return isDuplicate ? Promise.reject() : true;
    })
    .withMessage("পরিমাপের এককের নামটি বিদ্যমান রয়েছে"),
  body("isActive")
    .exists()
    .withMessage("পরিমাপের এককের সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .notEmpty()
    .withMessage("পরিমাপের এককের সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .isBoolean()
    .withMessage("পরিমাপের এককের সক্রিয়তা নিষ্ক্রিয়তা বুলিয়ান হতে হবে"),
];
