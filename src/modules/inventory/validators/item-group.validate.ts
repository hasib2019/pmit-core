// body("userId")
// .exists()
// .withMessage("পেলোড এ ইউজার আইডি পাওয়া যায়নি")
// .notEmpty()
// .withMessage("পেলোড এ ইউজার আইডি পাওয়া যায়নি")
// .custom(async (value) => {
//   const isUserIdExist = await isExistsByColumn("id", "users.user", await db.getConnection("slave"), { id: value });

//   return isUserIdExist ? true : Promise.reject();
// })
// .withMessage("ইউজার পাওয়া যায়নি"),
import { body } from "express-validator";
import { ItemGroupServices } from "../services/item-group.service";
import Container from "typedi";
export const itemGroupValidator = [
  body("groupName")
    .exists()
    .withMessage("গ্রুপের নাম পাওয়া যায়নি")
    .notEmpty()
    .withMessage("গ্রুপের নাম প্রদান করুন")
    .custom(async (value, { req }) => {
      const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
      const isDuplicate = await itemGroupService.checkIsGroupNameDuplicate(value, req.body?.id);
      return isDuplicate ? Promise.reject() : true;
    })
    .withMessage("এই নামটি ইতিমধ্যে বিদ্দমান রয়েছে"),
  body("id")
    .exists()
    .withMessage("গ্রুপের আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("গ্রুপের আইডি প্রদান করুন")
    .isInt()
    .withMessage("গ্রুপের আইডি অবশ্যই নাম্বার হতে হবে")
    .optional(),
];
