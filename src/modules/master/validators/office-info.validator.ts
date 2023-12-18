import { param, query } from "express-validator";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../utils/service.utils";

export const validateOfficeInfo = [
  query("divisionId")
    .exists()
    .withMessage("divisionId is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("divisionId must be integer")
    .notEmpty()
    .withMessage("divisionId cannot be empty")
    .bail(),
  query("districtId")
    .exists()
    .withMessage("districtId is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("districtId must be integer")
    .notEmpty()
    .withMessage("districtId cannot be empty")
    .bail(),
];

export const validateOfficeInfoOrigin = [
  param("origin")
    .exists()
    .withMessage("origin is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("origin must be integer")
    .notEmpty()
    .withMessage("origin cannot be empty")
    .bail()
    .custom(async (value: any) => {
      const origin = Number(value);
      const isOriginExist = await isExistsByColumn("id", "master.office_info", await pgConnect.getConnection("slave"), {
        originId: origin,
      });
      return isOriginExist ? true : Promise.reject();
    })
    .withMessage("origin does not exist"),
];
