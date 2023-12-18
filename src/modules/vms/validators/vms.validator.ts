import { body } from "express-validator";
import moment from "moment";

export const createDriverlist = [
  body("id").optional().isInt().withMessage("id is invalid"),
  body("nameBn").notEmpty().withMessage("নাম প্রদান করুন").isString().withMessage("বাংলায় নাম লিখুন"),
  body("nameEn").notEmpty().withMessage("ইংরেজি নাম প্রদান করুন").isString().withMessage("ইংরেজি নাম প্রদান করুন"),
  body("dob")
    .notEmpty()
    .withMessage("জন্মতারিখ প্রদান করুন")
    .isDate({ format: "DD/MM/YYYY", delimiters: ["/", "-"], strictMode: true })
    .withMessage("সঠিক জন্মতারিখ প্রদান করুন"),
  body("nid")
    .notEmpty()
    .withMessage("জাতীয় পরিচয়পত্র নাম্বার প্রদান করুন")
    .custom((value: any) => {
      const length: number = String(value).length;
      if (Number(length) == 10 || 17) {
        return true;
      } else {
        return false;
      }
    })
    .withMessage("সঠিক জাতীয় পরিচয়পত্র নাম্বার প্রদান করুন"),
  body("address").optional(),
  body("licenseNo")
    .notEmpty()
    .withMessage("লাইসেন্স নাম্বার প্রদান করুন")
    .isString()
    .withMessage("সঠিক লাইসেন্স নাম্বার প্রদান করুন"),
  body("servicingDay").optional(),
  body("startMile").optional(),
  body("updateHistory").optional(),
  body("updatedAt").optional(),
  body("updatedBy").optional(),
  body("servicingMile").optional(),
  body("createdAt").optional(),
  body("doptorId").optional(),
  body("createdBy").optional(),
];

export const vehicleInclusion = [
  body("id").optional().isInt({ min: 1 }).withMessage("সঠিক আইডি প্রদান করুন"),
  body("doptorId").optional(),
  body("name").notEmpty().withMessage("নাম প্রদান করুন").isString().withMessage("সঠিক নাম নাম্বার প্রদান করুন"),
  body("model")
    .notEmpty()
    .withMessage("মডেল নাম্বার প্রদান করুন")
    .isString()
    .withMessage("সঠিক মডেল নাম্বার প্রদান করুন"),
  body("regNum")
    .notEmpty()
    .withMessage("রেজিস্ট্রেশন নাম্বার প্রদান করুন")
    .isString()
    .withMessage("সঠিক রেজিস্ট্রেশন নাম্বার প্রদান করুন "),
  body("paymentTypeId")
    .notEmpty()
    .withMessage("পেমেন্ট মেথড আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক পেমেন্ট মেথড আইডি প্রদান করুন"),
  body("paymentFrqId")
    .notEmpty()
    .withMessage("পেমেন্ট ফ্রিকুয়েন্সি আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক পেমেন্ট ফ্রিকুয়েন্সি আইডি প্রদান করুন"),
  body("price").notEmpty().withMessage("মূল্য প্রদান করুন").isNumeric().withMessage("সঠিক মূল্য প্রদান করুন"),
  body("cc").notEmpty().withMessage("সিসি প্রদান করুন").isNumeric().withMessage("সঠিক সিসি প্রদান করুন"),
  body("sitNo")
    .notEmpty()
    .withMessage("গাড়ির সিট সংখ্যা প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("গাড়ির সঠিক সিট সংখ্যা প্রদান করুন"),
  body("purcahseDate")
    .notEmpty()
    .withMessage("ক্রয় করার তারিখ প্রদান করুন")
    .isDate({ format: "DD/MM/YYYY", delimiters: ["/", "-"], strictMode: true })
    .withMessage("ক্রয় করার সঠিক তারিখ প্রদান করুন"),
  body("chassisNum")
    .notEmpty()
    .withMessage("চেসিস নাম্বার প্রদান করুন")
    .isString()
    .withMessage("সঠিক চেসিস নাম্বার প্রদান করুন"),
  body("insuranceNo")
    .notEmpty()
    .withMessage("ইন্সুরেন্স নাম্বার প্রদান করুন")
    .isString()
    .withMessage("সঠিক ইন্সুরেন্স নাম্বার প্রদান করুন"),
  body("fitness")
    .notEmpty()
    .withMessage("ফিটনেস নাম্বার প্রদান করুন")
    .isString()
    .withMessage("সঠিক ফিটনেস নাম্বার প্রদান করুন"),
  body("categoryId")
    .notEmpty()
    .withMessage("ক্যাটাগরি আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক ক্যাটাগরি আইডি প্রদান করুন"),
  body("fuelTypeId")
    .notEmpty()
    .withMessage("ফুয়েল টাইপ আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক ফুয়েল টাইপ আইডি প্রদান করুন"),
  body("statusId")
    .notEmpty()
    .withMessage("স্ট্যাটাস আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক স্ট্যাটাস আইডি প্রদান করুন"),
  body("servicingDay")
    .notEmpty()
    .withMessage("সঠিক কি.মি প্রদান করুন")
    .isString()
    .withMessage("সঠিক কি.মি প্রদান করুন"),
  body("startMile").notEmpty().withMessage("সঠিক কি.মি প্রদান করুন").isString().withMessage("সঠিক কি.মি প্রদান করুন"),
  body("servicingMile")
    .notEmpty()
    .withMessage("সঠিক কি.মি প্রদান করুন")
    .isString()
    .withMessage("সঠিক কি.মি প্রদান করুন"),
  body("driverId")
    .notEmpty()
    .withMessage("ড্রাইভার আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক ড্রাইভার আইডি প্রদান করুন"),
  body("officeId")
    .notEmpty()
    .withMessage("কার্যালয় আইডি প্রদান করুন")
    .isInt({ min: 1 })
    .withMessage("সঠিক কার্যালয় আইডি প্রদান করুন"),
  body("details").optional(),
];

export const petropumpInclusion = [
  body("id").optional().isInt({ min: 1 }).withMessage("সঠিক আইডি প্রদান করুন"),
  body("doptorId").optional(),
  body("name").notEmpty().withMessage("নাম প্রদান করুন").isString().withMessage("সঠিক নাম প্রদান করুন"),
  body("contactPerson")
    .notEmpty()
    .withMessage("কন্টাক্ট পারসন এর নাম প্রদান করুন")
    .isString()
    .withMessage("কন্টাক্ট পারসন এর সঠিক নাম প্রদান করুন"),
  body("mobNum")
    .notEmpty()
    .withMessage(" প্রদান করুন")
    .isInt({ min: 10 })
    .withMessage("সঠিক মোবাইল নাম্বার প্রদান করুন"),
  body("address")
    .notEmpty()
    .withMessage("ঠিকানা প্রদান করুন")
    .isString()
    .withMessage("সঠিক ঠিকানা প্রদান করুন"),
];
