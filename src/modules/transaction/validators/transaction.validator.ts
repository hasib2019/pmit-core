import { body, query } from "express-validator";
import { BadRequestError } from "rdcd-common";

export const validateTransaction = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম ভুল ফরম্যাটে আছে"),
  body("productDetails").isArray({ min: 1 }).withMessage("ন্যূনতম একটি লেনদেনের তথ্য দেওয়া আবশ্যক"),
  body("productDetails.*.productId")
    .notEmpty()
    .withMessage("প্রোডাক্টের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের নাম ভুল ফরম্যাটে আছে"),
  body("productDetails.*.accountId")
    .notEmpty()
    .withMessage("একাউন্টের তথ্য দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("একাউন্টের তথ্য ভুল ফরম্যাটে আছে"),
  body("productDetails.*.tranAmt")
    .notEmpty()
    .withMessage("আদায়যোগ্য টাকার পরিমান দেওয়া আবশ্যক")
    .bail()
    .custom((value) => {
      if (isNaN(value) || parseFloat(value) <= 0)
        throw new BadRequestError("আদায়যোগ্য টাকার পরিমান অবশ্যই সাংখ্যিক এবং ০ অপেক্ষা বড় হতে হবে");
      else return true;
    }),
];
export const validateReverseMainTran = [
  query("tranNumber")
    .notEmpty()
    .withMessage("লেনদেনের নম্বর দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("লেনদেনের নম্বর সঠিক ভাবে উল্লেখ করুন"),
  query("tranDate")
    .notEmpty()
    .withMessage("লেনদেনের তারিখ দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("লেনদেনের তারিখ সঠিক ভাবে উল্লেখ করুন"),
];
