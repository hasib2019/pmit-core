import { body } from "express-validator";
import Container from "typedi";
import { StoreService } from "../services/store.service";

export const storeValidator = [
  // isActive: formik.values.isActive,

  body("id")
    .exists()
    .withMessage("ষ্টোর বা গুদামের আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("ষ্টোর বা গুদামের আইডি প্রদান করুন")
    .optional(),
  body("storeName")
    .exists()
    .withMessage("ষ্টোর বা গুদামের নাম প্রদান করুন")
    .notEmpty()
    .withMessage("ষ্টোর বা গুদামের নাম প্রদান করুন")
    .custom(async (value, { req }) => {
      const storeService: StoreService = Container.get(StoreService);
      const isDuplicate = await storeService.isStoreDuplicate(
        Number(req.user?.doptorId),
        Number(req.user?.officeId),
        value,
        req.body?.id
      );
      return isDuplicate ? Promise.reject() : true;
    })
    .withMessage("ষ্টোরের নামটি বিদ্যমান রয়েছে"),
  body("unitId").optional({ nullable: true }).isInt().withMessage("ইউনিট অবশ্যই নাম্বার হতে হবে"),
  // body("doptorId")
  //   .exists()
  //   .withMessage("দপ্তর নির্বাচন করুন")
  //   .notEmpty()
  //   .withMessage("দপ্তর নির্বাচন করুন")
  //   .isInt()
  //   .withMessage("দপ্তর আইডি অবশ্যই নাম্বার হতে হবে"),
  body("officeId")
    .exists()
    .withMessage("অফিস নির্বাচন করুন")
    .notEmpty()
    .withMessage("অফিস নির্বাচন করুন")
    .isInt()
    .withMessage("অফিস আইডি অবশ্যই নাম্বার হতে হবে"),
  body("storeDetails")
    .exists()
    .withMessage("ষ্টোরের বর্ণনা প্রদান করুন")
    .notEmpty()
    .withMessage("ষ্টোরের বর্ণনা প্রদান করুন")
    .optional(),
  body("adminDeskId")
    .exists()
    .withMessage("ষ্টোর এডমিন নির্বাচন করুন")
    .notEmpty()
    .withMessage("ষ্টোর এডমিন নির্বাচন করুন")
    .isInt()
    .withMessage("ষ্টোর এডমিন আইডি অবশ্যই নাম্বার হতে হবে"),
  body("isActive")
    .exists()
    .withMessage("ষ্টোরের সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .notEmpty()
    .withMessage("ষ্টোরের সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .isBoolean()
    .withMessage("ষ্টোরের সক্রিয়তা নিষ্ক্রিয়তা বুলিয়ান হতে হবে"),
];
