/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-02-21 12:21:55
 * @modify date 2022-02-21 12:21:55
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import { wrap } from "../../../middlewares/wraps.middle";

const router = Router();

router.get(
  "/",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { samityType: samityTypeId, samityLevel } = req.query;
    if (!samityTypeId || !samityLevel) {
      throw new BadRequestError("Samity type And samityLevel is required");
    }

    const { rows: data } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
      select 
        doc_type_id,
        doc_type,
        doc_type_desc,
        is_mandatory,
        mandatory_instruction,
        instruction_value,
        samity_level
      from 
        coop.samity_doc_mapping a, 
        master.document_type b
      where 
        a.doc_type_id = b.id
        and a.type='S' and a.samity_type_id = $1
        and b.is_active=true and a.samity_level=$2`,
      [samityTypeId, samityLevel]
    );

    res.status(200).send({
      message: "request successful",
      data: data ? toCamelKeys(data) : data,
    });
  })
);

router.get(
  "/all",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { rows: data } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
      select 
        *
      from 
        master.document_type
      where 
        is_active = $1`,
      [true]
    );

    res.status(200).send({
      message: "request successful",
      data: data ? toCamelKeys(data) : data,
    });
  })
);

export { router as samityDocRouter };
