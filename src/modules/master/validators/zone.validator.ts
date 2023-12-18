import { query } from "express-validator";

export const getDistrict = [
  query("allDistrict", "সকল জেলার তথ্য পাওয়ার অবস্থা অবশ্যই বুলিয়ান হতে হবে")
    .optional()
    .isBoolean(),
];

export const getUpazila = [
  query("district", "জেলা ভুল ফরম্যাটে আছে").optional().isInt().trim(),
  query("allUpazila", "সকল উপজেলার তথ্য পাওয়ার অবস্থা অবশ্যই বুলিয়ান হতে হবে")
    .optional()
    .isBoolean(),
  query("address", "Address must be in 0 or 1").optional().isIn([0, 1]),
  query("type", "Type must be in UPA or CITY").optional().isIn(["UPA", "CITY"]),
];

export const getUnion = [
  query("upazila", "উপজেলা ভুল ফরম্যাটে আছে").optional().isInt().trim(),
  query("allUnion", "সকল ইউনিয়নের তথ্য পাওয়ার অবস্থা অবশ্যই বুলিয়ান হতে হবে")
    .optional()
    .isBoolean(),
  query("address", "Address must be in 0 or 1").optional().isIn([0, 1]),
  query("type", "Type must be in UPA or CITY").optional().isIn(["UPA", "CITY"]),
];
