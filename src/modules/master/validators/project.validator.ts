import { body, param, query } from "express-validator";
import BadRequestError from "../../../errors/bad-request.error";

export const createProject = [
  body("projectName")
    .optional({ nullable: true })
    .isLength({ min: 1, max: 250 })
    .withMessage("প্রকল্প/ কর্মসূচির নাম দেওয়া আবশ্যক")
    .trim(),
  body("projectNameBangla")
    .notEmpty()
    .withMessage("প্রকল্প/ কর্মসূচির বাংলায় নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("বাংলায় প্রকল্প/কর্মসূচী নাম অবশ্যই ১-২৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("projectCode")
    .notEmpty()
    .withMessage("প্রকল্প/ কর্মসূচির কোড দেওয়া আবশ্যক")
    .bail()
    .isLength({ max: 2 })
    .withMessage("প্রকল্প/ কর্মসূচির কোড অবশ্যই ২ ডিজিটের হবে")
    // .matches(/^[A-Za-z0-9 ,.'-]+$/)
    // .withMessage("Invalid project code provided")
    // .bail()
    .trim(),
  body("projectDirector")
    .optional({ nullable: true })

    .isLength({ min: 1, max: 150 })
    .withMessage("প্রকল্প/কর্মসূচী পরিচালক অবশ্যই ১-১৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("initiateDate").notEmpty().withMessage("প্রকল্প/ কর্মসূচির শুরুর তারিখ দেওয়া আবশ্যক").trim(),
  body("projectDuration")
    .notEmpty()
    .withMessage("প্রকল্প/ কর্মসূচির মেয়াদ কাল দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প/ কর্মসূচির মেয়াদ কাল অবশ্যই সাংখ্যিক হতে হবে")
    .trim(),
  body("estimatedExp")
    .notEmpty()
    .withMessage("প্রাক্কলিত ব্যয়/ কর্মসূচীর ব্যয় দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রাক্কলিত ব্যয়/ কর্মসূচীর ব্যয় অবশ্যই সাংখ্যিক হতে হবে")
    .trim(),
  body("samityType")
    .notEmpty()
    .withMessage("সমিতির ধরন দেওয়া আবশ্যক")
    .bail()
    .isArray({ min: 1 })
    .withMessage("সমিতির ধরন সঠিকভাবে উল্লেখ করুন"),
  body("description")
    .notEmpty()
    .withMessage("প্রকল্প/কর্মসূচী বর্ননা দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 350 })
    .withMessage("প্রকল্প/কর্মসূচী বর্ননা অবশ্যই ১-৩৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("fundSource")
    .notEmpty()
    .withMessage("প্রকল্পের/ কর্মসূচীর অর্থের উৎস দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 150 })
    .withMessage("প্রকল্প/কর্মসূচী আয়ের উৎস অবশ্যই ১-১৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("expireDate").notEmpty().withMessage("প্রকল্প/ কর্মসূচির মেয়াদ উত্তীর্ণ তারিখ দেওয়া আবশ্যক").trim(),
  body("projectPhase")
    .notEmpty()
    .withMessage("প্রকল্পের/ কর্মসূচীর অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isIn(["P", "K"])
    .withMessage("প্রকল্পের/ কর্মসূচীর অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("admissionFee").optional().isInt({ min: 0 }).withMessage("সদস্যের ভর্তি ফি অবশ্যই সাংখ্যিক হতে হবে"),
  body("admissionGlId").custom((value, { req }) => {
    let admissionGl;
    if (value && value != "নির্বাচন করুন") admissionGl = Number(value);
    if (value && !req.body.admissionFee) {
      throw new BadRequestError("সদস্যের ভর্তি ফি উল্লেখ করুন");
    } else {
      if (req.body.admissionFee && Number(req.body.admissionFee) > 0 && (!value || value == "নির্বাচন করুন")) {
        throw new BadRequestError("সদস্যের ভর্তি ফি জিএল নির্বাচন করুন");
      } else if (req.body.admissionFee && Number(req.body.admissionFee) > 0 && !Number.isInteger(admissionGl)) {
        throw new BadRequestError("সদস্যের ভর্তি ফি জিএল সঠিকভাবে উল্লেখ করুন");
      } else {
        return true;
      }
    }
  }),
  body("passbookFee").optional().isInt({ min: 0 }).withMessage("সদস্যের পাসবুক ফি অবশ্যই সাংখ্যিক হতে হবে"),
  body("passbookGlId").custom((value, { req }) => {
    let passbookGl;
    if (value && value != "নির্বাচন করুন") passbookGl = Number(value);

    if (value && !req.body.passbookFee) {
      throw new BadRequestError("সদস্যের পাসবুক ফি উল্লেখ করুন");
    } else {
      if (req.body.passbookFee && Number(req.body.passbookFee) > 0 && (!value || value == "নির্বাচন করুন")) {
        throw new BadRequestError("সদস্যের পাসবুক ফি জিএল নির্বাচন করুন");
      } else if (req.body.passbookFee && Number(req.body.passbookFee) > 0 && !Number.isInteger(passbookGl)) {
        throw new BadRequestError("সদস্যের পাসবুক জিএল সঠিকভাবে উল্লেখ করুন");
      } else {
        return true;
      }
    }
  }),
  body("isDefaultSavingsProduct")
    .notEmpty()
    .withMessage("ডিফল্ট সেভিংস প্রোডাক্টের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ডিফল্ট সেভিংস প্রোডাক্টের অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim()
    .toBoolean(),
  body("isDefaultShareProduct")
    .notEmpty()
    .withMessage("ডিফল্ট শেয়ার প্রোডাক্টের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ডিফল্ট শেয়ার প্রোডাক্টের অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim()
    .toBoolean(),
];

export const updateProject = [
  param("id", "Invalid id number is provided").isInt({ min: 1 }),
  body("projectCode")
    .notEmpty()
    .withMessage("প্রকল্প/ কর্মসূচির কোড দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 2, max: 2 })
    .withMessage("প্রকল্প/ কর্মসূচির কোড অবশ্যই ২ ডিজিটের হবে")
    // .matches(/^[A-Za-z0-9 ,.'-]+$/)
    // .withMessage("Invalid project code provided")
    // .bail()
    .trim(),
  body("projectDirector")
    .optional({ nullable: true })

    .isLength({ min: 1, max: 150 })
    .withMessage("প্রকল্প/কর্মসূচী পরিচালক অবশ্যই ১-১৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("projectDuration")
    .notEmpty()
    .withMessage("প্রকল্প/ কর্মসূচির মেয়াদ কাল দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প/ কর্মসূচির মেয়াদ কাল অবশ্যই সাংখ্যিক হতে হবে")
    .trim(),
  body("estimatedExp")
    .notEmpty()
    .withMessage("প্রাক্কলিত ব্যয়/ কর্মসূচীর ব্যয় দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রাক্কলিত ব্যয়/ কর্মসূচীর ব্যয় অবশ্যই সাংখ্যিক হতে হবে")
    .trim(),
  body("samityType")
    .notEmpty()
    .withMessage("সমিতির ধরন দেওয়া আবশ্যক")
    .bail()
    .isArray({ min: 1 })
    .withMessage("সমিতির ধরন ভুল ফরম্যাটে আছে"),
  body("description")
    .notEmpty()
    .withMessage("প্রকল্প/কর্মসূচী বর্ননা দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 350 })
    .withMessage("প্রকল্প/কর্মসূচী বর্ননা অবশ্যই ১-৩৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("fundSource")
    .notEmpty()
    .withMessage("প্রকল্পের/ কর্মসূচীর অর্থের উৎস দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 150 })
    .withMessage("প্রকল্প/কর্মসূচী আয়ের উৎস অবশ্যই ১-১৫০ অক্ষরের মধ্যেই হবে")
    .trim(),
  body("expireDate").notEmpty().withMessage("প্রকল্প/ কর্মসূচির মেয়াদ উত্তীর্ণ তারিখ দেওয়া আবশ্যক").trim(),
  body("projectPhase")
    .notEmpty()
    .withMessage("প্রকল্পের/ কর্মসূচীর অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isIn(["P", "K"])
    .withMessage("প্রকল্পের/ কর্মসূচীর অবস্থা ভুল ফরম্যাটে আছে")
    .trim(),
  body("admissionFee").optional().isInt({ min: 0 }).withMessage("সদস্যের ভর্তি ফি অবশ্যই সাংখ্যিক হতে হবে"),
  body("admissionGlId").custom((value, { req }) => {
    let admissionGl;
    if (value && value != "নির্বাচন করুন") admissionGl = Number(value);
    if (value && !req.body.admissionFee) {
      throw new BadRequestError("সদস্যের ভর্তি ফি উল্লেখ করুন");
    } else {
      if (req.body.admissionFee && Number(req.body.admissionFee) > 0 && (!value || value == "নির্বাচন করুন")) {
        throw new BadRequestError("সদস্যের ভর্তি ফি জিএল নির্বাচন করুন");
      } else if (req.body.admissionFee && Number(req.body.admissionFee) > 0 && !Number.isInteger(admissionGl)) {
        throw new BadRequestError("সদস্যের ভর্তি ফি জিএল সঠিকভাবে উল্লেখ করুন");
      } else {
        return true;
      }
    }
  }),
  body("passbookFee").optional().isInt({ min: 0 }).withMessage("সদস্যের পাসবুক ফি অবশ্যই সাংখ্যিক হতে হবে"),
  body("passbookGlId").custom((value, { req }) => {
    let passbookGl;
    if (value && value != "নির্বাচন করুন") passbookGl = Number(value);
    if (value && !req.body.passbookFee) {
      throw new BadRequestError("সদস্যের পাসবুক ফি উল্লেখ করুন");
    } else {
      if (req.body.passbookFee && Number(req.body.passbookFee) > 0 && (!value || value == "নির্বাচন করুন")) {
        throw new BadRequestError("সদস্যের পাসবুক ফি জিএল নির্বাচন করুন");
      } else if (req.body.passbookFee && Number(req.body.passbookFee) > 0 && !Number.isInteger(passbookGl)) {
        throw new BadRequestError("সদস্যের পাসবুক জিএল সঠিকভাবে উল্লেখ করুন");
      } else {
        return true;
      }
    }
  }),
  body("isDefaultSavingsProduct")
    .notEmpty()
    .withMessage("ডিফল্ট প্রোডাক্টের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ডিফল্ট প্রোডাক্টের অবস্থা ভুল ফরম্যাটে আছে")
    .trim(),
  body("isDefaultShareProduct")
    .notEmpty()
    .withMessage("ডিফল্ট শেয়ার প্রোডাক্টের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ডিফল্ট শেয়ার প্রোডাক্টের অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim()
    .toBoolean(),
];

export const getProjectWithFilter = [
  query("page", "পেইজের নম্বর অবশ্যই সাংখ্যিক হতে হবে").isInt({ min: 1 }),
  query("limit", "পেইজের লিমিটের নম্বর অবশ্যই সাংখ্যিক হতে হবে").optional().isInt({ min: 1 }),
  query("id", "প্রকল্প/ কর্মসূচির আইডি ভুল ফরম্যাটে আছে").optional().isInt({ min: 1 }),
  query("projectName", "Name must be in range 1 to 250 characters").optional().isLength({ min: 1, max: 250 }).trim(),
  query("initiateDate", "Invalid initiate date provided").optional().trim(),
  query("expireDate", "Invalid expire date provided").optional().trim(),
  query("projectPhase", "Allowed project phase P, K").optional().isIn(["P", "K"]),
  query("officeId", "Invalid office id provided").optional().isInt({ min: 1 }),
  query("doptorId", "Invalid doptor id provided").optional().isInt({ min: 1 }),
];

export const userWiseProject = [
  body("userId")
    .optional({ nullable: true })
    // .matches(/^[A-Za-z0-9 ,.'-]+$/)

    // .withMessage("Invalid project name provided")
    // .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("প্রকল্প/কর্মসূচী নাম অবশ্যই ১-২৫০ অক্ষরের মধ্যে হবে")
    .trim(),
];

export const getUser = [
  query("officeId").optional().isInt({ min: 0 }).withMessage("অফিস আইডি ভুল ফরম্যাটে আছে").trim(),
  query("doptorId").optional().isInt({ min: 0 }).withMessage("দপ্তর আইডি ভুল ফরম্যাটে আছে").trim(),
];
