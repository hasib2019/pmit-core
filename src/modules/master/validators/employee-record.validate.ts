import { param } from "express-validator";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../utils/service.utils";

export const validateEmployeeRecord = [
  param("officeId")
    .exists()
    .withMessage("officeId is required")
    .isInt()
    .withMessage("officeId must be an integer")
    .custom(async (value, { req }) => {
      const isOfficeIDExist = await isExistsByColumn(
        "id",
        "master.office_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isOfficeIDExist ? true : Promise.reject();
    })
    .withMessage("officeId does not exist In Database"),
];
