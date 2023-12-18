import { body } from "express-validator";
export const validateSubGl = [
  body("projectId").optional({ nullable: true }),
  body("samityId").optional({ nullable: true }),
  body("data.subGl.*.id").optional({ nullable: true }).isInt().withMessage("সাব জিএল এর ধরণ ভুল ফরম্যাটে আছে"),
  body("data.subGl.*.type")
    .notEmpty()
    .withMessage("সাব জিএল এর ধরণ আবশ্যিক")
    .bail()
    .isInt()
    .withMessage("সাব জিএল এর ধরণ ভুল ফরম্যাটে আছে"),
  body("data.subGl.*.name")
    .notEmpty()
    .withMessage("সাব জিএল এর নাম আবশ্যিক")
    .bail()
    .isString()
    .withMessage("সাব জিএল এর নাম ভুল ফরম্যাটে আছে"),
  body("data.subGl.*.refNo")
    .notEmpty()
    .withMessage("সাব জিএল এর রেফারেন্স নম্বর আবশ্যিক")
    .bail()
    .isString()
    .withMessage("সাব জিএল এর রেফারেন্স নম্বর ভুল ফরম্যাটে আছে"),
  body("data.subGl.*.isActive")
    .notEmpty()
    .withMessage("সাব জিএল এর অবস্থা (সচল/অচল) আবশ্যিক")
    .bail()
    .isBoolean()
    .withMessage("সাব জিএল এর অবস্থা (সচল/অচল) ভুল ফরম্যাটে আছে"),
  // body("nextAppDesignationId")
  //   .notEmpty()
  //   .withMessage("পরবর্তী অনুমোদনের প্রতিনিধি আবশ্যিক")
  //   .bail()
  //   .isInt({ min: 1 })
  //   .withMessage("পরবর্তী অনুমোদনের প্রতিনিধি ভুল ফরম্যাটে আছে"),
];
