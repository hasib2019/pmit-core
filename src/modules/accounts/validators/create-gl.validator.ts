import { body } from "express-validator";
export const createGlValidator = [
  body("glacName")
    .exists()
    .withMessage("জি এল একাউন্ট এর নাম পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("জি এল একাউন্ট এর নাম দিন"),
  body("parentChild")
    .exists()
    .withMessage("প্যারেন্ট চাইল্ড পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("প্যারেন্ট চাইল্ড নাল হতে পারে না"),
  body("parentId")
    .exists()
    .withMessage("জি এল একাউন্ট এর প্যারেন্ট আইডি পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("জি এল একাউন্ট এর পেরেন্ট আইডি নির্বাচন করুন"),
  body("glacType")
    .exists()
    .withMessage("জি এল একাউন্ট এর ধরণ পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("জি এল একাউন্ট এর ধরণ নির্বাচন করুন"),

  body("glNature")
    .exists()
    .withMessage("জি এল এর  প্রকৃতি পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("জি এল এর প্রকৃতি নাল হতে পারে না"),
  body("isActive")
    .exists()
    .withMessage("পেলোডে সক্রিয় বিদ্যমান নেই")
    .notEmpty()
    .withMessage("সক্রিয় নাল হতে পারে না"),
  body("authorize_status")
    .exists()
    .withMessage("পেলোডে অনুমোদিত স্ট্যাটাস নেই")
    .notEmpty()
    .withMessage("অনুমোদিত স্ট্যাটাস নাল হতে পারে না"),
  body("parentGlCode")
    .exists()
    .withMessage("প্যারেন্ট লেজার কোড পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("প্যারেন্ট লেজার কোড নাল হতে পারে না"),
  body("useOffice")
    .exists()
    .withMessage("কোন অফিস এ ব্যবহৃত হবে পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("কোন অফিস এ ব্যবহৃত হবে নাল হতে পারে না"),
  body("allowManualDr")
    .exists()
    .withMessage("পেলোডে ম্যানুয়াল ডেবিটকে অনুমতি দিন বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে ম্যানুয়াল ডেবিটকে অনুমতি দিন নাল হতে পারে না")
    .optional(),
  body("allowManualCr")
    .exists()
    .withMessage("পেলোড এ ম্যানুয়াল ক্রেডিট কে অনুমতি দিন বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোড এ ম্যানুয়াল ক্রেডিট কে অনুমতি দিন নাল হতে পারে না")
    .optional(),
  body("subGl")
    .exists()
    .withMessage("সাব লেজার পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("সাব লেজার নাল হতে পারে না")
    .optional(),
  body("isGeneralHead")
    .exists()
    .withMessage("পেলোডে জেনারেল হেড বিদ্যমান  নেই")
    .notEmpty()
    .withMessage("পেলোডে জেনারেল হেড নাল হতে পারে না")
    .optional(),
  body("isBankBalance")
    .exists()
    .withMessage("পেলোডে ব্যাঙ্ক ব্যালেন্স বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে ব্যাঙ্ক ব্যালেন্স নাল হতে পারে না")
    .optional(),
  body("isCashInHand")
    .exists()
    .withMessage("পেলোডে ক্যাশ ইন হ্যান্ড বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে ক্যাশ ইন হ্যান্ড নাল হতে পারে না")
    .optional(),
  body("isReceivable")
    .exists()
    .withMessage("পেলোডে রিসিভাবল বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে রিসিভাবল নাল হতে পারে না")
    .optional(),
  body("isPayable")
    .exists()
    .withMessage("পেয়েবল পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেয়েবল নাল হতে পারে না")
    .optional(),
  body("isBudgetHead")
    .exists()
    .withMessage("পেলোডে বাজেট হেড বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে বাজেট হেড নাল হতে পারে না")
    .optional(),
  body("isProductGl")
    .exists()
    .withMessage(" পেলোডে প্রোডাক্ট লেজার বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে প্রোডাক্ট লেজার নাল হতে পারে না")
    .optional(),
  body("useOffice")
    .exists()
    .withMessage("কোন অফিস এ ব্যবহৃত হবে পেলোড এ বিদ্যমান নেই")
    .notEmpty()
    .withMessage("কোন অফিস এ ব্যবহৃত হবে নাল হতে পারে না"),
  body("isBudgetHead")
    .exists()
    .withMessage("পেলোডে বাজেট হেড বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে বাজেট হেড নাল হতে পারে না"),
  body("isSavingsProductGl")
    .exists()
    .withMessage("সেভিংস প্রোডাক্ট লেজার হেড পেলোডে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("সেভিংস প্রোডাক্ট লেজার হেড নাল হতে পারে না"),
];
