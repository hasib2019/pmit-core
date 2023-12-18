import { body, param, query } from "express-validator";
import { isInteger } from "lodash";
import moment from "moment-timezone";
import { BadRequestError, isJSON } from "rdcd-common";

export const createSamity = [
  body("resourceName").notEmpty().withMessage("সঠিক রিসোর্সের নাম উল্লেখ করুন").trim(),
  body("districtId")
    .notEmpty()
    .withMessage("জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("upaCityId")
    .notEmpty()
    .withMessage("উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("upaCityType")
    .notEmpty()
    .withMessage("উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.flag")
    .notEmpty()
    .withMessage("সমিতির ফ্ল্যাগ দেওয়া আবশ্যক")
    .bail()
    .isIn(["1", "2", "3", "4"])
    .withMessage("সমিতির ফ্ল্যাগ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.address")
    .notEmpty()
    .withMessage("সমিতির ঠিকানা দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সমিতির ঠিকানা ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.foCode")
    .notEmpty()
    .withMessage("মাঠকর্মী দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("মাঠকর্মী সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.uniThanaPawId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.districtId")
    .notEmpty()
    .withMessage("জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.upaCityId")
    .notEmpty()
    .withMessage("উপজেলা/সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("উপজেলা/সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.samityName")
    .notEmpty()
    .withMessage("সমিতির নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সমিতির নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.workPlaceLat")
    .optional({ nullable: true })
    .isString()
    .withMessage("Please enter a valid lattitude")
    .trim(),
  body("data.basic.workPlaceLong")
    .optional({ nullable: true })
    .isString()
    .withMessage("Please enter a valid longitude")
    .trim(),
  body("data.basic.meetingType")
    .notEmpty()
    .withMessage("সমিতির মিটিং এর ধরণ দেওয়া আবশ্যক")
    .isIn(["M", "W"])
    .withMessage("সমিতির মিটিং এর ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.weekPosition")
    .optional({ nullable: true })
    .isIn([1, 2, 3, 4])
    .withMessage("সমিতির মিটিং এর সপ্তাহের পজিশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.meetingDay")
    .notEmpty()
    .withMessage("সমিতির মিটিং এর দিন দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("সমিতির মিটিং এর দিন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.workAreaRadius")
    .optional({ nullable: true })
    .isInt({ max: 50 })
    .withMessage("Working area radius must be less than 50 meter")
    .trim(),
  body("data.basic.instituteCode")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের কোড সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.instituteName")
    .optional({ nullable: true })
    .isLength({ max: 250 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের নাম ২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.instituteAddress", "Invalid institute address")
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের ঠিকানা ১০০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.coopRegNumber", "Invalid coopRegNumber")
    .optional({ nullable: true })
    .isLength({ max: 250 })
    .withMessage("সমবায় সমিতির নিবন্ধন নম্বর সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.isSme")
    .optional({ nullable: true })
    .isIn(["true", "false"])
    .withMessage("সিস্টেমের প্রয়োজনে সমিতির অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.samityType")
    .optional({ nullable: true })
    .isIn(["S", "G"])
    .withMessage("সমিতির ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.memberMinAge")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সদস্যের সর্বনিম্ন বয়স সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.memberMaxAge")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সদস্যের সর্বোচ্চ বয়স সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.samityMinMember")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সর্বনিম্ন সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.samityMaxMember")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সর্বোচ্চ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.groupMinMember")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির দলের সর্বনিম্ন সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),

  body("data.setup.groupMaxMember")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির দলের সর্বোচ্চ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.shareAmount", "Invalid share amount is provided")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির শেয়ার সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.samityMemberType", "Invalid samityMemberType is provided")
    .optional({ nullable: true })
    .isIn(["M", "F", "B"])
    .withMessage("সমিতির সদস্যের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
];

export const updateSamity = [
  param("id", "সমিতির আইডি সঠিকভাবে উল্লেখ করুন").notEmpty().isInt({ min: 1 }),
  body("address")
    .optional({ nullable: true })
    .isLength({ min: 1, max: 250 })
    .withMessage("সমিতির ঠিকানা ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("foCode").optional({ nullable: true }).isInt({ min: 1 }).withMessage("মাঠকর্মী সঠিকভাবে উল্লেখ করুন").trim(),
  body("unionId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("projectId").optional({ nullable: true }).isInt({ min: 1 }).withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন").trim(),
  body("districtId").optional({ nullable: true }).isInt({ min: 1 }).withMessage("জেলা সঠিকভাবে উল্লেখ করুন").trim(),
  body("upazilaId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("উপজেলা/সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("samityName")
    .optional({ nullable: true })
    .isLength({ min: 1, max: 250 })
    .withMessage("সমিতির নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("workPlaceLat").optional({ nullable: true }).isString().withMessage("Please enter a valid lattitude").trim(),
  body("workPlaceLong").optional({ nullable: true }).isString().withMessage("Please enter a valid longitude").trim(),
  body("workAreaRadius")
    .optional({ nullable: true })
    .isInt({ max: 50 })
    .withMessage("Working area radius must be less than 50 meter")
    .trim(),
  body("instituteCode")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের কোড সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("instituteName")
    .optional({ nullable: true })
    .isLength({ max: 250 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের নাম ২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("instituteAddress")
    .optional({ nullable: true })
    .isLength({ max: 250 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের ঠিকানা ২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("isSme")
    .optional({ nullable: true })
    .isIn(["true", "false"])
    .withMessage("সিস্টেমের প্রয়োজনে সমিতির অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("samityType")
    .optional({ nullable: true })
    .isIn(["S", "G"])
    .withMessage("সমিতির ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberMinAge")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সদস্যের সর্বনিম্ন বয়স সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberMaxAge")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সদস্যের সর্বোচ্চ বয়স সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("samityMinMember")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সর্বনিম্ন সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("samityMaxMember")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সর্বোচ্চ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("groupMinMember")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির দলের সর্বনিম্ন সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("groupMaxMember")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির দলের সর্বোচ্চ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("shareAmount")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির শেয়ার সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("samityMemberType")
    .optional({ nullable: true })
    .isIn(["M", "F", "B"])
    .withMessage("সমিতির সদস্যের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
];

export const createDol = [
  body("resourceName").notEmpty().withMessage("সঠিক রিসোর্সের নাম উল্লেখ করুন").trim(),
  body("districtId")
    .notEmpty()
    .withMessage("জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("upaCityId")
    .notEmpty()
    .withMessage("উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("upaCityType")
    .notEmpty()
    .withMessage("উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.dolName")
    .notEmpty()
    .withMessage(`দলের নাম দেওয়া আবশ্যক`)
    // .matches(/^[A-Za-z0-9 ,.'-]+$/)
    // .withMessage("Invalid project name provided")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("দলের নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.isActive")
    .notEmpty()
    .withMessage(`দলের অবস্থা দেওয়া আবশ্যক`)
    .bail()
    .isBoolean()
    .withMessage(`দলের অবস্থা সঠিকভাবে উল্লেখ করুন`),
  body("data.samityId")
    .notEmpty()
    .withMessage("সমিতি দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতি সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.memberId")
    .notEmpty()
    .withMessage("দলে সদস্য দেওয়া আবশ্যক")
    .isArray({ min: 1 })
    .withMessage("দলে সর্বনিম্ন ১ জন সদস্য আবশ্যক"),
  body("districtId").optional(),
  body("upazilaId").optional(),
];

export const updateDol = [
  param("id", "দলের আইডি সঠিকভাবে উল্লেখ করুন").notEmpty().isInt({ min: 1 }),
  body("dolName")
    .optional({ nullable: true })
    // .matches(/^[A-Za-z0-9 ,.'-]+$/)
    // .withMessage("Invalid project name provided")
    // .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("দলের নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("isActive", "দলের অবস্থা সঠিকভাবে উল্লেখ করুন").notEmpty().isIn(["true", "false"]),
  body("memberList").optional(),
  body("removeList").optional(),
];

export const approveDol = [
  body("dolId")
    .notEmpty()
    .withMessage("দলের আইডি সঠিকভাবে উল্লেখ করুন")
    .isArray({ min: 1 })
    .withMessage("অনুমোদন করতে কমপক্ষে ১টি দল সিলেক্ট আবশ্যক"),
];

export const rejectDol = [
  body("rejectId")
    .notEmpty()
    .withMessage("দলের আইডি সঠিকভাবে উল্লেখ করুন")
    .isArray({ min: 1 })
    .withMessage("অনুমোদন করতে কমপক্ষে ১টি দল সিলেক্ট আবশ্যক"),
];

export const getMembersWithFilter = [
  query("page", "পেইজের নম্বর সঠিকভাবে উল্লেখ করুন").isInt({ min: 1 }),
  query("samityId", "সমিতি সঠিকভাবে উল্লেখ করুন").isInt({ min: 1 }),
  query("limit", "পেইজের লিমিট সংখ্যা সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("id", "সদস্যের আইডি সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("nameBn", "সদস্যের বাংলা নাম সঠিকভাবে উল্লেখ করুন").optional().isLength({ min: 1 }),
  query("nameEn", "সদস্যের ইংরেজি নাম সঠিকভাবে উল্লেখ করুন").optional().isLength({ min: 1 }),
  query("mobileNumber", "সদস্যের মোবাইল নম্বর সঠিকভাবে উল্লেখ করুন").optional().isLength({ min: 1 }),
  query("customerCode", "সদস্যের কোড সঠিকভাবে উল্লেখ করুন").optional().isLength({ min: 1 }),
];

export const getSamityTempInfo = [
  query("id", "রিসোর্সের আইডি সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("type", "রিসোর্সের ধরণ সঠিকভাবে উল্লেখ করুন").optional({ nullable: true }).isIn(["samityInfo", "memberInfo"]),
  query("officeId", "অফিস সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
];

export const getSamityNamefromTempandMain = [
  query("value", "ফ্ল্যাগের মান বিদ্যমান সমিতির জন্য ১ ও নতুন সমিতির জন্য ২ দেওয়া আবশ্যক").isIn([1, 2]),
  query("project", "প্রকল্প সঠিকভাবে উল্লেখ করুন").isInt({ min: 1 }),
  query("coop", "সমবায়ের ফ্ল্যাগের অবস্থা সঠিকভাবে উল্লেখ করুন").optional({ nullable: true }).isInt({ min: 0 }),
  query("samityType", "সমিতির ধরণ সঠিকভাবে উল্লেখ করুন").optional({ nullable: true }).isIn(["S", "G"]),
];

export const getSingleSamity = [
  query("value", "ফ্ল্যাগের মান বিদ্যমান সমিতির জন্য ১ ও নতুন সমিতির জন্য ২ দেওয়া আবশ্যক").isIn([1, 2]),
  query("id", "সমিতির আইডি সঠিকভাবে উল্লেখ করুন").isInt({ min: 1 }),
];

export const getMemberBySamity = [
  query("samityId", "সমিতির আইডি সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("flag", "ফ্ল্যাগের মান বিদ্যমান সমিতির জন্য ১ ও নতুন সমিতির জন্য ২ দেওয়া আবশ্যক").optional().isIn(["1", "2"]),
  query("defaultMembers", "ডিফল্ট সদস্যের ফ্ল্যাগের মান ০ অথবা ১").optional().isIn(["0", "1"]),
];

export const getSingleMember = [query("memberId", "সদস্যের আইডি দেওয়া আবশ্যক").isInt({ min: 1 })];

export const createCoopAndSurveyMembers = [
  query("id", "সমিতি সঠিকভাবে উল্লেখ করুন").isInt({ min: 1 }),
  body("memberInfo.*.address").isObject().withMessage("ঠিকানা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.per.districtId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.upaCityId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.upaCityType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.uniThanaPawId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.uniThanaPawType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.village")
    .optional()
    .isString()
    .withMessage("স্থায়ী ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.per.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("স্থায়ী ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.*.address.pre.districtId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.upaCityId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.upaCityType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.uniThanaPawId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.uniThanaPawType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.village")
    .optional()
    .isLength({ min: 1, max: 250 })
    .withMessage("বর্তমান ঠিকানার বর্ণনা ১-২৫০ অক্ষরের মধ্য হতে হবে"),
  body("memberInfo.*.address.pre.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("বর্তমান ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.*.data.nameBn")
    .notEmpty()
    .withMessage("সদস্যের বাংলা নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের বাংলা নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.nameEn")
    .notEmpty()
    .withMessage("সদস্যের ইংরেজি নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের ইংরেজি নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid name in english provided"),
  body("memberInfo.*.data.fatherName")
    .notEmpty()
    .withMessage("সদস্যের পিতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের পিতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid father name provided"),
  body("memberInfo.*.data.motherName")
    .notEmpty()
    .withMessage("সদস্যের মাতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের মাতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid mother name provided"),
  body("memberInfo.*.data.birthDate").notEmpty().withMessage("সদস্যের জন্ম তারিখ দেওয়া আবশ্যক"),
  body("memberInfo.*.data.mobileNumber")
    .notEmpty()
    .withMessage("সদস্যের মোবাইল নম্বর দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 11, max: 11 })
    .withMessage("সদস্যের মোবাইল নম্বর ১১ডিজিট হতে হবে"),
  body("memberInfo.*.data.religion")
    .notEmpty()
    .withMessage("সদস্যের ধর্ম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের ধর্ম সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.gender")
    .notEmpty()
    .withMessage("সদস্যের লিঙ্গ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের লিঙ্গ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.maritalStatus")
    .notEmpty()
    .withMessage("সদস্যের বৈবাহিক অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বৈবাহিক অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.spouseName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের স্বামী/স্ত্রীর নাম ২৫০ অক্ষরের মধ্যে হতে হবে ")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid spouse name provided"),
  body("memberInfo.*.data.education")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শিক্ষাগত যোগ্যতা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.occupation")
    .notEmpty()
    .withMessage("সদস্যের পেশা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের পেশা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.yearlyIncome")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সদস্যের বার্ষিক আয় সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.familyMemberMale")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের পরিবারের পুরুষ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.familyMemberFemale")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের পরিবারের মহিলা সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.familyHead")
    .optional({ nullable: true })
    .isIn(["Y", "N"])
    .withMessage("সদস্য পরিবারের প্রধান কিনা তা উল্লেখ করুন"),
  body("memberInfo.*.data.ownResidence")
    .optional({ nullable: true })
    .isIn(["Y", "N"])
    .withMessage("সদস্যের নিজ বাড়ি আছে কিনা তা উল্লেখ করুন"),
  body("memberInfo.*.data.residenceRemarks")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের বাড়ির বর্ণনা ২৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.memberDocuments.*.documentType")
    .notEmpty()
    .withMessage("সদস্যের ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage("সদস্যের ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentNumber")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 30 })
    .withMessage("সদস্যের ডকুমেন্টের নম্বর ৩০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.memberDocuments.*.documentFront")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentFrontType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentBack")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentBackType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
];

export const createMembers = [
  body("memberInfo.*.data.age")
    .notEmpty()
    .withMessage("সদস্যের বয়স দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বয়স সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.gender")
    .notEmpty()
    .withMessage("সদস্যের লিঙ্গ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের লিঙ্গ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.nameBn")
    .notEmpty()
    .withMessage("সদস্যের বাংলা নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের বাংলা নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.nameEn")
    .notEmpty()
    .withMessage("সদস্যের ইংরেজি নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের ইংরেজি নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid name in english provided"),
  body("memberInfo.*.data.religion")
    .notEmpty()
    .withMessage("সদস্যের ধর্ম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের ধর্ম সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.education")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শিক্ষাগত যোগ্যতা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.birthDate").notEmpty().withMessage("সদস্যের জন্ম তারিখ দেওয়া আবশ্যক"),
  body("memberInfo.*.data.occupation")
    .notEmpty()
    .withMessage("সদস্যের পেশা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের পেশা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentType")
    .notEmpty()
    .withMessage("সদস্যের ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage("সদস্যের ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentNumber")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 30 })
    .withMessage("সদস্যের ডকুমেন্টের নম্বর ৩০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.memberDocuments.*.documentFront")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentFrontType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentBack")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentBackType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.data.fatherName")
    .notEmpty()
    .withMessage("সদস্যের পিতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের পিতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid father name provided"),
  body("memberInfo.*.data.fatherNid")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের পিতার জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.*.data.motherName")
    .notEmpty()
    .withMessage("সদস্যের মাতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের মাতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid mother name provided"),

  body("memberInfo.*.data.motherNid")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের মাতার জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.*.data.mobileNumber")
    .notEmpty()
    .withMessage("সদস্যের মোবাইল নম্বর দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 11, max: 11 })
    .withMessage("সদস্যের মোবাইল নম্বর ১১ডিজিট হতে হবে"),
  body("memberInfo.*.data.yearlyIncome")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সদস্যের বার্ষিক আয় সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.maritalStatus")
    .notEmpty()
    .withMessage("সদস্যের বৈবাহিক অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বৈবাহিক অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.spouseName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের স্বামী/স্ত্রীর নাম ২৫০ অক্ষরের মধ্যে হতে হবে ")
    .bail(),
  body("memberInfo.*.data.email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("সঠিক ইমেইল আইডি প্রদান করুন")
    .normalizeEmail(),
  body("memberInfo.*.address").isObject().withMessage("ঠিকানা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.per.districtId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.upaCityId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.upaCityType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.uniThanaPawId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.uniThanaPawType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.village")
    .optional()
    .isString()
    .withMessage("স্থায়ী ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.per.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("স্থায়ী ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.*.address.pre.districtId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.upaCityId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.upaCityType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.uniThanaPawId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.uniThanaPawType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.village")
    .optional()
    .isString()
    .withMessage("বর্তমান ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.pre.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("বর্তমান ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.*.guardianInfo").optional({ nullable: true }),
  body("memberInfo.*.guardianInfo.guardianName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের অভিভাবকের নাম ২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail()
    .trim(),
  body("memberInfo.*.guardianInfo.documentNo")
    .optional()
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের অভিভাবিকের জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.*.guardianInfo.relation")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("অভিভাবকের সাথে সদস্যের সম্পর্ক সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.guardianInfo.occupation")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("অভিভাবকের পেশা সঠিকভাবে উল্লেখ করুন"),

  body("memberInfo.*.nominee")
    .notEmpty()
    .withMessage("নমিনির তথ্য দেওয়া আবশ্যক")
    .bail()
    .custom((value: any) => {
      return checkArrayJsonFormat(value);
    })
    .withMessage("নমিনির তথ্য সঠিকভাবে উল্লেখ করুন")
    .custom((value: any) => {
      return checkNomineePercentage(value);
    })
    .withMessage("সকল নমিনির সর্বমোট শতকরার পরিমাণ অবশ্যই ১০০% হতে হবে"),
  body("memberInfo.*.nominee.*.nomineeName")
    .notEmpty()
    .withMessage("নমিনির নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("নমিনির নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail()
    // .matches(/^[A-Za-z ,.'-]+$/)
    // .withMessage("Invalid nominee name provided")
    .trim(),
  body("memberInfo.*.nominee.*.relation")
    .notEmpty()
    .withMessage("নমিনির সাথে সদস্যের সম্পর্ক দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("নমিনির সাথে সদস্যের সম্পর্ক সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.nominee.*.percentage")
    .notEmpty()
    .withMessage("নমিনির শতকরা পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1, max: 100 })
    .withMessage("নমিনির শতকরা পরিমাণ ১-১০০ এর মধ্যে হতে হবে"),
  body("memberInfo.*.nominee.*.docNumber")
    .notEmpty()
    .withMessage("নমিনির ডকুমেন্টের নম্বর দেওয়া  আবশ্যক")
    .bail()
    .isLength({ min: 0, max: 30 })
    .withMessage("নমিনির ডকুমেন্টের নম্বর ৩০ এর মধ্যে হতে হবে"),
  body("memberInfo.*.nominee.*.docType")
    .notEmpty()
    .withMessage("নমিনির ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage("নমিনির ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.nominee.*.nomineeSign")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("নমিনির স্বাক্ষরের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.nominee.*.nomineeSignType")
    .optional({ nullable: true })
    .isString()
    .withMessage("নমিনির স্বাক্ষরের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.nominee.*.nomineePicture")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("নমিনির ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.nominee.*.nomineePictureType")
    .optional({ nullable: true })
    .isString()
    .withMessage("নমিনির ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.data.classId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শ্রেণি সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.section")
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 })
    .withMessage("সদস্যের শ্রেণির সেকশনের নাম ৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.rollNo")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শ্রেণি রোল সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.memberSign")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("সদস্যের স্বাক্ষরের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.memberSignType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের স্বাক্ষরের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.memberPicture")
    .optional({ nullable: true })
    .isBase64()
    .withMessage("সদস্যের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.memberPictureType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
];

export const samityMemberApproval = [
  body("approveId")
    .notEmpty()
    .withMessage("অনুমোদনের জন্য সমিতি সিলেক্ট আবশ্যক")
    .bail()
    .isArray({ min: 1 })
    .withMessage("অনুমোদন করতে কমপক্ষে ১টি দল সিলেক্ট আবশ্যক")
    .bail()
    .custom((value) => {
      return checkIntegerArray(value);
    })
    .withMessage("অনুমোদনের জন্য সমিতি সঠিকভাবে উল্লেখ করুন"),
];

export const memberAttendance = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প ভুল ফরম্যাটে আছে"),
  body("samityId")
    .notEmpty()
    .withMessage("সমিতি দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতি ভুল ফরম্যাটে আছে"),
  body("meetingTypeId")
    .notEmpty()
    .withMessage("সভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সভার ধরণ ভুল ফরম্যাটে আছে"),
  body("meetingAgenda").optional({ nullable: true }).isString().withMessage("সভার আলোচ্যসূচি ভুল ফরম্যাটে আছে"),
  body("meetingNotes").optional({ nullable: true }).isString().withMessage("সভার মন্তব্য ভুল ফরম্যাটে আছে"),
  body("meetingDate").custom((value) => {
    if (!value || value == "null") throw new BadRequestError(`সভার তারিখ দেওয়া আবশ্যক`);
    else {
      if (value != "null" && moment.isDate(new Date(value))) return true;
      else throw new BadRequestError(`সভার তারিখ সঠিকভাবে উল্লেখ করুন`);
    }
  }),
  body("attachment").optional(),
  body("attendance")
    .custom((value: any) => {
      if (JSON.parse(value).length <= 0) return false;
      else return true;
    })
    .withMessage("ন্যূনতম একজনের উপস্থিতির তথ্য দেওয়া আবশ্যক"),
  // .bail()
  // .custom((value: any) => {
  //   return checkArrayObjectFormat(value);
  // })
  // .withMessage("উপস্থিতির তথ্য ভুল ফরম্যাটে আছে"),
];

export const updateMember = [
  body("memberInfo.data.age")
    .notEmpty()
    .withMessage("সদস্যের বয়স দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বয়স সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.gender")
    .notEmpty()
    .withMessage("সদস্যের লিঙ্গ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের লিঙ্গ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.nameBn")
    .notEmpty()
    .withMessage("সদস্যের বাংলা নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের বাংলা নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.data.nameEn")
    .notEmpty()
    .withMessage("সদস্যের ইংরেজি নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের ইংরেজি নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.data.religion")
    .notEmpty()
    .withMessage("সদস্যের ধর্ম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের ধর্ম সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.education")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শিক্ষাগত যোগ্যতা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.birthDate").notEmpty().withMessage("সদস্যের জন্ম তারিখ দেওয়া আবশ্যক"),
  body("memberInfo.data.occupation")
    .notEmpty()
    .withMessage("সদস্যের পেশা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের পেশা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.memberDocuments.*.documentType")
    .notEmpty()
    .withMessage("সদস্যের ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage("সদস্যের ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.memberDocuments.*.documentNumber")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 30 })
    .withMessage("সদস্যের ডকুমেন্টের নম্বর ৩০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.data.memberDocuments.*.documentFront")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.data.memberDocuments.*.documentFrontType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.data.memberDocuments.*.documentBack")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.data.memberDocuments.*.documentBackType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.data.fatherName")
    .notEmpty()
    .withMessage("সদস্যের পিতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের পিতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid father name provided"),
  body("memberInfo.data.fatherNid")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের পিতার জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.data.motherName")
    .notEmpty()
    .withMessage("সদস্যের মাতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের মাতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid mother name provided"),

  body("memberInfo.data.motherNid")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের মাতার জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.data.mobileNumber")
    .notEmpty()
    .withMessage("সদস্যের মোবাইল নম্বর দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 11, max: 11 })
    .withMessage("সদস্যের মোবাইল নম্বর ১১ডিজিট হতে হবে"),
  body("memberInfo.data.yearlyIncome")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সদস্যের বার্ষিক আয় সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.maritalStatus")
    .notEmpty()
    .withMessage("সদস্যের বৈবাহিক অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বৈবাহিক অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.spouseName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের স্বামী/স্ত্রীর নাম ২৫০ অক্ষরের মধ্যে হতে হবে ")
    .bail(),
  body("memberInfo.data.email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("সঠিক ইমেইল আইডি প্রদান করুন")
    .normalizeEmail(),
  body("memberInfo.address").isObject().withMessage("ঠিকানা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.address.per.districtId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.per.upaCityId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.per.upaCityType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.per.uniThanaPawId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.per.uniThanaPawType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.per.village")
    .optional()
    .isString()
    .withMessage("স্থায়ী ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.address.per.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("স্থায়ী ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),

  body("memberInfo.address.pre.districtId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.pre.upaCityId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.pre.upaCityType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.pre.uniThanaPawId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.pre.uniThanaPawType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.address.pre.village")
    .optional()
    .isString()
    .withMessage("বর্তমান ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.address.pre.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("বর্তমান ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.guardianInfo").optional({ nullable: true }),
  body("memberInfo.guardianInfo.guardianName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের অভিভাবকের নাম ২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail()
    // .matches(/^[A-Za-z ,.'-]+$/)
    // .withMessage("Invalid guardian name provided")
    .trim(),
  body("memberInfo.guardianInfo.documentNo")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের অভিভাবকের জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.guardianInfo.relation")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("অভিভাবকের সাথে সদস্যের সম্পর্ক সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.guardianInfo.occupation")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("অভিভাবকের পেশা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.nominee")
    .notEmpty()
    .withMessage("নমিনির তথ্য দেওয়া আবশ্যক")
    .bail()
    .custom((value: any) => {
      return checkArrayJsonFormat(value);
    })
    .withMessage("নমিনির তথ্য সঠিকভাবে উল্লেখ করুন")
    .custom((value: any) => {
      return checkNomineePercentage(value);
    })
    .withMessage("সকল নমিনির সর্বমোট শতকরার পরিমাণ অবশ্যই ১০০% হতে হবে"),
  body("memberInfo.nominee.*.nomineeName")
    .notEmpty()
    .withMessage("নমিনির নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("নমিনির নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail()
    // .matches(/^[A-Za-z ,.'-]+$/)
    // .withMessage("Invalid nominee name provided")
    .trim(),
  body("memberInfo.nominee.*.relation")
    .notEmpty()
    .withMessage("নমিনির সাথে সদস্যের সম্পর্ক দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("নমিনির সাথে সদস্যের সম্পর্ক সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.nominee.*.percentage")
    .notEmpty()
    .withMessage("নমিনির শতকরা পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1, max: 100 })
    .withMessage("নমিনির শতকরা পরিমাণ ১-১০০ এর মধ্যে হতে হবে"),
  body("memberInfo.nominee.*.docNumber")
    .notEmpty()
    .withMessage("নমিনির ডকুমেন্টের নম্বর দেওয়া  আবশ্যক")
    .bail()
    .isLength({ min: 0, max: 30 })
    .withMessage("নমিনির ডকুমেন্টের নম্বর ৩০ এর মধ্যে হতে হবে"),
  body("memberInfo.nominee.*.docType")
    .notEmpty()
    .withMessage("নমিনির ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage("নমিনির ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.nominee.*.nomineeSign")
    .optional({ nullable: true })
    .isString()
    .withMessage("নমিনির স্বাক্ষরের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.nominee.*.nomineeSignType")
    .optional({ nullable: true })
    .isString()
    .withMessage("নমিনির স্বাক্ষরের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.nominee.*.nomineePicture")
    .optional({ nullable: true })
    .isString()
    .withMessage("নমিনির ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.nominee.*.nomineePictureType")
    .optional({ nullable: true })
    .isString()
    .withMessage("নমিনির ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.data.classId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শ্রেণি সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.data.section")
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 })
    .withMessage("সদস্যের শ্রেণির সেকশনের নাম ৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.data.rollNo")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শ্রেণি রোল সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.memberSign").optional({ nullable: true }),
  // .isBase64(optio)
  // .withMessage("সদস্যের স্বাক্ষরের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.memberSignType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের স্বাক্ষরের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.memberPicture").optional({ nullable: true }),
  // .isBase64()
  // .withMessage("সদস্যের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.memberPictureType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.memberDocFront").optional({ nullable: true }),
  // .isBase64()
  // .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.memberDocFrontType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.memberDocBack").optional({ nullable: true }),
  // .isBase64()
  // .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.memberDocBackType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
];

function nidLengthCheck(nid: string) {
  const length: number = String(nid).length;

  if (Number(length) == 10 || 17) {
    return true;
  } else {
    return false;
  }
}

function checkArrayJsonFormat(value: any) {
  if (isJSON(JSON.stringify(value))) return true;
  else return false;
}

function checkArrayObjectFormat(value: any) {
  if (isJSON(JSON.parse(value))) return true;
  else return false;
}

function checkNomineePercentage(value: any) {
  //const json = JSON.parse(value);

  let total: number = 0;
  for (const item of value) total += Number(item.percentage);
  if (total == 100) return true;
  else return false;
}

function checkIntegerArray(array: []) {
  for (const item of array) {
    if (!isInteger(item)) return false;
    else continue;
  }
  return true;
}
