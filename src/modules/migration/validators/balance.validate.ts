/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-01-02 10:45:03
 * @modify date 2023-01-02 10:45:03
 * @desc [description]
 */

import { body, Meta } from "express-validator";
import Container from "typedi";
import { BalanceMigrationInputAttrs } from "./../interfaces/balance-migration.interface";
import { BalanceMigrationService } from "./../services/balance-migration.service";

export const validateBalance = [
  body("nextAppDesignationId").isInt({ min: 1 }).withMessage("কর্মকর্তা নির্বাচন করুন "),
  body("projectId").isInt({ min: 1 }).withMessage("প্রোজেক্ট পাওয়া যায়নি").optional(),
  body("data").isArray({ min: 1 }).withMessage("ব্যালেন্সের তথ্য পাওয়া যায়নি"),
  body("data.*.id").isInt({ min: 1 }).withMessage("জিএল আইডি পাওয়া যায়নি"),
  body("data.*.glCode").notEmpty().withMessage("জিএল কোড পাওয়া যায়নি"),
  body("data.*.glName").notEmpty().withMessage("জিএলের নাম পাওয়া যাইনি"),
  body("data.*").custom(async (value: BalanceMigrationInputAttrs, { req, path }: Meta) => {
    const doptorId = req.user.doptorId;
    const balanceMigrationService = Container.get(BalanceMigrationService);
    const projectId = req.body.projectId;
    const isExists = await balanceMigrationService.validateGL(doptorId,projectId, value);

    return isExists == true
      ? true
      : isExists == false
      ? Promise.reject(`জিএল কোডঃ ${value.glCode} - জিএল আইডি, জিএল কোড এবং জিএলের নাম মিল পাওয়া যায় নি।`)
      : Promise.reject(isExists);
  }),
];
