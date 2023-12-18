import { body } from "express-validator";
import Container from "typedi";
import { ItemService } from "../services/item.service";

export const itemValidator = [
  body("id")
    .exists()
    .withMessage("আইটেমের আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("আইটেমের আইডি প্রদান করুন")
    .optional(),
  body("groupId").exists().withMessage("").notEmpty().withMessage("").optional(),
  body("categoryId")
    .exists()
    .withMessage("ক্যাটাগরি নাম নির্বাচন করুন")
    .notEmpty()
    .withMessage("ক্যাটাগরি নাম নির্বাচন করুন")
    .isInt()
    .withMessage("ক্যাটাগরি আইডি অবশ্যই নাম্বার হতে হবে"),
  body("itemName")
    .exists()
    .withMessage("মালামালের নাম প্রদান করুন")
    .notEmpty()
    .withMessage("মালামালের নাম প্রদান করুন")
    .custom(async (value, { req }) => {
      const itemService: ItemService = Container.get(ItemService);
      const isDuplicate: any = await itemService.isItemDuplicate(value, req.body?.id);
      return isDuplicate ? Promise.reject() : true;
    })
    .withMessage("মালামালের নামটি বিদ্যমান রয়েছে"),
  body("hsCode")
    .exists()
    .withMessage("মাল্মালের এইচ এস কোড প্রদান করুন")
    .notEmpty()
    .withMessage("মাল্মালের এইচ এস কোড প্রদান করুন")
    .optional(),
  body("description")
    .exists()
    .withMessage("মালামালের বর্ণনা প্রদান করুন")
    .notEmpty()
    .withMessage("মালামালের বর্ণনা প্রদান করুন")
    .optional(),
  body("model").exists().withMessage("মালামালের মডেল প্রদান করুন").notEmpty().withMessage("মালামালের মডেল প্রদান করুন"),
  body("mouId")
    .exists()
    .withMessage("মালামালের পরিমাপের একক প্রদান করুন")
    .notEmpty()
    .withMessage("মালামালের পরিমাপের একক প্রদান করুন")
    .isInt()
    .withMessage("মালামালের পরিমাপের একক অবশ্যই নাম্বার হতে হবে"),
  body("unitPrice")
    .exists()
    .withMessage("মালামালের প্রতি এককের মুল প্রদান করুন")
    .notEmpty()
    .withMessage("মালামালের প্রতি এককের মুল প্রদান করুন"),
  body("isAsset").exists().withMessage("সম্পদ কিনা নির্বাচন করুন").notEmpty().withMessage("সম্পদ কিনা নির্বাচন করুন"),
  body("goodsType")
    .exists()
    .withMessage("মালামালের অবস্থা নির্বাচন করুন")
    .notEmpty()
    .withMessage("মালামালের অবস্থা নির্বাচন করুন"),

  body("reorderLevelQuantity")
    .exists()
    .withMessage("পুনরায় আবেদনের পরিমান প্রদান করুন")
    .notEmpty()
    .withMessage("পুনরায় আবেদনের পরিমান প্রদান করুন")
    .optional(),
  body("doptorItems")
    .exists()
    .withMessage("দপ্তর আইটেম নির্বাচন করুন")
    .notEmpty()
    .withMessage("দপ্তর আইটেম নির্বাচন করুন")
    .isArray()
    .withMessage("দপ্তর আইটেম নির্বাচন করুন")
    .optional(),

  body("isActive")
    .exists()
    .withMessage("মালামালের সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .notEmpty()
    .withMessage("মালামালের সক্রিয়তা নিষ্ক্রিয়তা নির্বাচন করুন")
    .isBoolean()
    .withMessage("মালামালের সক্রিয়তা নিষ্ক্রিয়তা বুলিয়ান হতে হবে"),
];
