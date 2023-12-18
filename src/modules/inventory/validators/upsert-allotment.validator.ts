import { body } from "express-validator";

export const upsertValidator = [
  body()
    .isArray({ min: 1 })
    .withMessage("বরাদ্দের তথ্য অবশ্যই একটি অ্যারে হতে হবে এবং দৈর্ঘ্য অবশ্যই ০-এর বেশি হতে হবে"),
  body("*.itemId")
    .exists()
    .withMessage("আইটেমের আইডি বিদ্যমান নেই")
    .notEmpty()
    .withMessage("আইটেমের আইডি বিদ্যমান নেই")
    .isInt()
    .withMessage("আইটেমের আইডি ইনটিজার হতে হবে"),
  body("*.originDesignationId")
    .exists()
    .withMessage("পদবির আইডি বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পদবির আইডি বিদ্যমান নেই")
    .isInt()
    .withMessage("পদবির আইডি ইনটিজার হতে হবে"),
  body("*.quantity")
    .exists()
    .withMessage("পরিমাণ বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পরিমাণ বিদ্যমান নেই")
    .isNumeric()
    .withMessage("পরিমাণ নাম্বার হতে হবে")
    .custom((value) => {
      if (value > 0) {
        return true;
      } else {
        return false;
      }
    })
    .withMessage("পরিমাণ ঋণাত্মক হতে পারবেনা "),
];
