import { body } from "express-validator";
import Container from "typedi";
import { ItemCategoryService } from "../services/item-category.service";

export const categoryValidator = [
  body("id")
    .exists()
    .withMessage("ক্যাটাগরির আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("ক্যাটাগরির আইডি প্রদান করুন")
    .isInt()
    .withMessage("আইডি অবশ্যই নাম্বার হতে হবে")
    .optional(),
  body("groupId")
    .exists()
    .withMessage("গ্রুপ নির্বাচন করুন")
    .notEmpty()
    .withMessage("গ্রুপ নির্বাচন করুন")
    .isInt()
    .withMessage("গ্রুপের আইডি অবশ্যই নাম্বার হতে হবে"),
  // body("categoryCode").exists().withMessage("কোড প্রদান করুন").notEmpty().withMessage("কোড প্রদান করুন"),
  body("categoryName")
    .exists()
    .withMessage("ক্যাটাগরি নাম প্রদান করুন")
    .notEmpty()
    .withMessage("ক্যাটাগরি নাম প্রদান করুন")
    .custom(async (value, { req }) => {
      const categoryService: ItemCategoryService = Container.get(ItemCategoryService);
      const isDuplicate = await categoryService.isCategoryDuplicate(value, req.body?.id);
      return isDuplicate ? Promise.reject() : true;
    })
    .withMessage("ক্যাটাগরি নামটি বিদ্যমান রয়েছে"),
  // body("assetType")
  //   .exists()
  //   .withMessage("সম্পদের ধরন নির্বাচন করুন")
  //   .notEmpty()
  //   .withMessage("সম্পদের ধরন নির্বাচন করুন")
  //   .isBoolean()
  //   .withMessage("সম্পদের ধরন বুলিয়ান হতে হবে"),
];
