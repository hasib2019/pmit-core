import { query } from "express-validator";

export const getSanctionDocValidator = [
  query("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  query("productId")
    .notEmpty()
    .withMessage("প্রোডাক্টের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  query("customerId")
    .notEmpty()
    .withMessage("সদস্যের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের নাম সঠিকভাবে উল্লেখ করুন"),
];

export const getSanctionMessageValidator = [
  query("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  query("productId")
    .notEmpty()
    .withMessage("প্রোডাক্টের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  query("id")
    .notEmpty()
    .withMessage("সদস্যের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের নাম সঠিকভাবে উল্লেখ করুন"),
];
