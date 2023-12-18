import { query } from "express-validator";

export const externalCustomerFinancialApiValidator = [
  query("officeId")
    .notEmpty()
    .withMessage("অফিসের আইডি দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("অফিসের আইডি সঠিকভাবে উল্লেখ করুন"),
  query("originSamityId")
    .notEmpty()
    .withMessage("কম্পোনেন্টের সমিতি আইডি দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("কম্পোনেন্টের সমিতি আইডি সঠিকভাবে উল্লেখ করুন"),
];
