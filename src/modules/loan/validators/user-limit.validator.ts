import { body, query } from "express-validator";
import BadRequestError from "../../../errors/bad-request.error";

export const getUserLimitValidator = [
  query("status")
    .notEmpty()
    .withMessage("রোল না ব্যবহারকারীর ভিত্তিতে নির্বাচন করা আবশ্যক")
    .bail()
    .isIn([1, 2])
    .withMessage("রোল না ব্যবহারকারীর ভিত্তিতে সেটা সঠিকভাবে নির্বাচন করুন"),
  query("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("প্রকল্প সঠিকভাবে নির্বাচন করুন"),
  query("roleId")
    .optional({ nullable: true })
    .isInt()
    .withMessage("রোলের নাম সঠিকভাবে উল্লেখ করুন"),
  query("userId")
    .optional({ nullable: true })
    .isInt()
    .withMessage("ব্যবহারকারীর নাম সঠিকভাবে উল্লেখ করুন"),
];

export const createUserLimitValidator = [
  body("saveStatus")
    .notEmpty()
    .withMessage("রোল না ব্যবহারকারীর ভিত্তিতে নির্বাচন করা আবশ্যক")
    .bail()
    .isIn([1, 2])
    .withMessage("রোল না ব্যবহারকারীর ভিত্তিতে সেটা সঠিকভাবে নির্বাচন করুন"),
  body("roleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("রোলের নাম সঠিকভাবে উল্লেখ করুন"),
  body("loanApproveLimit")
    .isArray({ min: 1 })
    .withMessage("ন্যূনতম ১টি লিমিট উল্লেখ করুন"),
  body("loanApproveLimit.*.productId")
    .notEmpty()
    .withMessage("প্রোডাক্ট দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("প্রোডাক্ট সঠিকভাবে উল্লেখ করুন"),
  body("loanApproveLimit.*.projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  body("loanApproveLimit.*.limitAmount")
    .notEmpty()
    .withMessage("ঋণের অনুমোদনের সীমা দেওয়া আবশ্যিক")
    .bail()
    .isNumeric()
    .withMessage("ঋণের অনুমোদনের সীমা সঠিকভাবে উল্লেখ করুন"),
  body("loanApproveLimit.*.userId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ব্যবহারকারীর নাম সঠিকভাবে উল্লেখ করুন"),
];
