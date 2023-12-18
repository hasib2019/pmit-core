import { body } from "express-validator";
import Container from "typedi";
import { SupplierService } from "../services/supplier.service";
export const supplierValidator = [
  body("id")
    .exists()
    .withMessage("সরবরাহকারীর আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর আইডি প্রদান করুন")
    .isInt()
    .withMessage("সরবরাহকারীর আইডি নাম্বার হতে হবে ")
    .optional(),
  body("supplierName")
    .exists()
    .withMessage("সরবরাহকারীর নাম প্রদান করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর নাম প্রদান করুন")
    .custom(async (value, { req }) => {
      const supplierService: SupplierService = Container.get(SupplierService);
      const isDuplicate = await supplierService.checkIsSupplierDuplicate(
        Number(req?.user?.doptorId),
        Number(req?.user?.officeId),
        value,
        req.body?.id
      );
      return isDuplicate ? Promise.reject() : true;
    })
    .withMessage("সরবরাহকারীর নামটি ইতিমদ্ধে বিদ্যমান রয়েছে"),
  body("contactPersonName")
    .exists()
    .withMessage("যোগাযোগের বেক্তির নাম প্রদান করুন")
    .notEmpty()
    .withMessage("যোগাযোগের বেক্তির নাম প্রদান করুন"),
  body("mobileNumber")
    .exists()
    .withMessage("সরবরাহকারীর মোবাইল নাম্বার প্রদান করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর মোবাইল নাম্বার প্রদান করুন")
    .matches(/(^(01){1}[3456789]{1}(\d){8})$/)
    .withMessage("সঠিক মোবাইল নাম্বার প্রদান করুন"),
  body("emailId")
    .exists()
    .withMessage("সরবরাহকারীর ইমেইল আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর ইমেইল আইডি প্রদান করুন")
    .isEmail()
    .withMessage("সঠিক ইমেইল আইডি প্রদান করুন"),
  body("address")
    .exists()
    .withMessage("সরবরাহকারীর ঠিকানা প্রদান করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর ঠিকানা প্রদান করুন"),
  body("supplierDetails")
    .exists()
    .withMessage("সরবরাহকারীর বর্ণনা প্রদান করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর বর্ণনা প্রদান করুন")
    .optional(),
  body("isActive")
    .exists()
    .withMessage("সরবরাহকারীর সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .notEmpty()
    .withMessage("সরবরাহকারীর সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .isBoolean()
    .withMessage("সরবরাহকারীর সক্রিয়তা নিষ্ক্রিয়তা বুলিয়ান হতে হবে"),
];
