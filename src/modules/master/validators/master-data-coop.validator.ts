/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-01-10 15:24:01
 * @modify date 2022-01-10 15:24:01
 * @desc [description]
 */

import { Meta, param } from "express-validator";
import { toSnakeCase } from "keys-transform";
import { compact, get, isArray, omit } from "lodash";
import { MasterDataAttrs } from "../interfaces/master-data.interface";
import { masterDataInfo } from "../types/master-data.type";

export const validateMasterData = [
  param("dataType")
    .exists()
    .withMessage("Master data type is required")
    .notEmpty()
    .withMessage("Master data type cannot be null")
    .trim()
    .isIn(Object.keys(masterDataInfo))
    .withMessage(
      `Master data type should be within [${Object.keys(
        masterDataInfo
      ).toString()}]`
    )
    .custom((value: MasterDataAttrs, { req: { query, body } }: Meta) => {
      const keys = Object.keys(omit(query, ["isPagination", "type"])).map((k) =>
        toSnakeCase(k)
      );
      const values = Object.values(omit(query, ["isPagination", "type"]));

      const type = get(query, "type");

      const typeExist = isTypeExist(type);
      if (value === "geo-code" && !typeExist) return false;

      const path = (typeExist ? `${value}.${type}` : value) + ".fields";
      const fields = get(masterDataInfo, path) as Array<string>;

      if (!isArray(fields)) return false;

      return (
        keys.every((k) => fields.includes(k)) &&
        keys.length === compact(values).length
      );
    })
    .withMessage("query params invalid"),
];

const isTypeExist = (type: any) => {
  const keys = Object.keys(masterDataInfo["geo-code"]);
  return keys.includes(type);
};
