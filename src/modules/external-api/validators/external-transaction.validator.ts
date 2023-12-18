import { body } from "express-validator";

export const externalTransactionApiValidator = [
  body("doptorId")
    .notEmpty()
    .withMessage("দপ্তরের আইডি দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("দপ্তরের আইডি সঠিকভাবে উল্লেখ করুন"),
  body("officeId")
    .notEmpty()
    .withMessage("অফিসের আইডি দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("অফিসের আইডি সঠিকভাবে উল্লেখ করুন"),
  body("projectId").optional({ nullable: true }).isInt().withMessage("প্রকল্পের আইডি সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের সেট দেওয়া আবশ্যক")
    .bail()
    .isArray({ min: 1 })
    .withMessage("ট্রান্সাকশনের সেট সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets.*.naration")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের বর্ণনা দেওয়া আবশ্যক")
    .bail()
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage("ট্রান্সাকশনের বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets.*.drcrCode")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["D", "C"])
    .withMessage("ট্রান্সাকশনের ধরণ(ডেবিট- D, ক্রেডিট- C) সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets.*.glCode")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের জিএল কোড দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("ট্রান্সাকশনের জিএল কোড সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets.*.tranAmt")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("ট্রান্সাকশনের পরিমাণ সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets.*.tranCode")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের কোড দেওয়া আবশ্যক")
    .bail()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("ট্রান্সাকশনের কোড সঠিকভাবে উল্লেখ করুন"),
  body("transactionSets.*.tranType")
    .notEmpty()
    .withMessage("ট্রান্সাকশনের মিডিয়াম দেওয়া আবশ্যক")
    .bail()
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage("ট্রান্সাকশনের মিডিয়াম সঠিকভাবে উল্লেখ করুন"),
];
