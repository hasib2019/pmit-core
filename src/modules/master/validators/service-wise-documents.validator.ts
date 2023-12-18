import { body, CustomSanitizer } from "express-validator";
import BadRequestError from "../../../errors/bad-request.error";

const toInt: CustomSanitizer = (value) => {
  return value.map((v: any) => {
    return parseInt(v);
  });
};

export const serviceWiseDocMapping = [
  body("projectId")
    .notEmpty()
    .withMessage(`প্রকল্পের নাম দেওয়া আবশ্যক`)
    .bail()
    .isInt()
    .withMessage(`প্রকল্প সঠিকভাবে উল্লেখ করুন`),
  body("serviceId")
    .notEmpty()
    .withMessage(`সেবার নাম দেওয়া আবশ্যক`)
    .bail()
    .isInt()
    .withMessage(`সেবা সঠিকভাবে উল্লেখ করুন`),
  body("serviceRules.memberDocs.*.docTypeId")
    .notEmpty()
    .withMessage(`সদস্যের প্রয়োজনীয় ডকুমেন্টের নাম দেওয়া আবশ্যক`)
    .bail()
    .isInt()
    .withMessage(`সদস্যের প্রয়োজনীয় ডকুমেন্টের নাম সঠিকভাবে উল্লেখ করুন`),
  body("serviceRules.memberDocs.*.docRadio")
    .notEmpty()
    .withMessage(`সদস্যের প্রয়োজনীয় ডকুমেন্টটি দেওয়া আবশ্যিক কিনা উল্লেখ করুন`)
    .bail()
    .isIn(["docM", "docOpt"])
    .withMessage(`সদস্যের প্রয়োজনীয় ডকুমেন্টটি দেওয়া আবশ্যিক কিনা সঠিকভাবে উল্লেখ করুন`),
  body("serviceRules.nomineeDocs.*.docTypeId")
    .notEmpty()
    .withMessage(`নমিনির প্রয়োজনীয় ডকুমেন্টের নাম দেওয়া আবশ্যক`)
    .bail()
    .isInt()
    .withMessage(`নমিনির প্রয়োজনীয় ডকুমেন্টের নাম সঠিকভাবে উল্লেখ করুন`),
  body("serviceRules.nomineeDocs.*.docRadio")
    .notEmpty()
    .withMessage(`নমিনির প্রয়োজনীয় ডকুমেন্টটি দেওয়া আবশ্যিক কিনা উল্লেখ করুন`)
    .bail()
    .isIn(["docM", "docOpt"])
    .withMessage(`নমিনির প্রয়োজনীয় ডকুমেন্টটি দেওয়া আবশ্যিক কিনা সঠিকভাবে উল্লেখ করুন`),
];
