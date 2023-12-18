import { query } from "express-validator";

export const validateServiceCharge = [
  query("principal")
    .exists()
    .withMessage("ঋণের পরিমান দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের পরিমান অবশ্যই ০ অপেক্ষা বড় হতে হবে"),
  query("loanTerm")
    .exists()
    .withMessage("ঋণের মেয়াদ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের মেয়াদ অবশ্যই ০ অপেক্ষা বড় হতে হবে"),
  query("rate")
    .exists()
    .withMessage("সার্ভিস চার্জের হার দেওয়া আবশ্যক")
    .bail()
    .isFloat({ min: 1 })
    .withMessage("সার্ভিস চার্জের হার অবশ্যই ০ অপেক্ষা বড় হতে হবে"),
  query("interestType").optional().isIn(["F", "D", "DOC"]).withMessage("সঠিক সার্ভিস চার্জের ধরণ উল্লেখ করুন"),
  query("installmentType").optional().isIn(["M", "W", "O", "Q"]).withMessage("সঠিক কিস্তি আদায়ের সময়কাল উল্লেখ করুন"),
  query("installmentNumber").optional().isInt({ min: 1 }).withMessage("কিস্তির সংখ্যা অবশ্যই ০ অপেক্ষা বড় হতে হবে"),
  query("disbursementDate")
    .optional()
    .isDate({ format: "YYYY/MM/DD", delimiters: ["/", "-"] }),
  query("gracePeriodType")
    .optional()
    .isIn(["NO", "NO-CHARGE", "EQUAL"])
    .withMessage("গ্রেস পিরিয়ডের ধরণ সঠিকভাবে উল্লেখ করুন"),
  query("gracePeriod").optional().isInt({ min: 0 }).withMessage("গ্রেস পিরিয়ড অবশ্যই সাংখ্যিক হতে হবে"),
  query("meetingDay")
    .optional()
    .isIn(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"])
    .withMessage("মিটিং এর দিন সঠিকভাবে উল্লেখ করুন"),
  query("weekPosition").optional().isInt({ min: 0, max: 4 }).withMessage("মিটিং এর সঠিক সাপ্তাহিক পজিশন উল্লেখ করুন"),
  query("doptorId").optional().isInt().withMessage("দপ্তর সঠিকভাবে উল্লেখ করুন"),
  query("officeId").optional().isInt().withMessage("অফিস সঠিকভাবে উল্লেখ করুন"),
  query("holidayEffect").optional().isIn(["NWD", "NMD", "NO"]).withMessage("holidayEffect must be NWD, NMD or NO"),
  query("roundingType").optional().isIn(["C", "F"]).withMessage("roundingType must be C or F"),
  query("roundingValue").optional().isInt().withMessage("roundingValue must be number"),
];
