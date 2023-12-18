import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { validates } from "../../../middlewares/express-validation.middle";
import Container from "typedi";
import ZoneService from "../services/zone.service";
import { auth } from "../../user/middlewares/auth.middle";
import { getCode } from "../../../configs/auth.config";
import {
  getDistrict,
  getUnion,
  getUpazila,
} from "../validators/zone.validator";

const router: Router = express.Router();

/**
 * Get division info with user access control
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/division",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const zoneService: ZoneService = Container.get(ZoneService);
    const result = await zoneService.getDivision(req.user.divisionId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get district info with user access control
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/district",
  auth(["*"]),
  validates(getDistrict),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const zoneService: ZoneService = Container.get(ZoneService);
    var result;
    if (req.query.allDistrict)
      result = await zoneService.getDistrict(null, null, null);
    else
      result = await zoneService.getDistrict(
        Number(req.user.divisionId),
        Number(req.user.districtId),
        Number(req.user.officeLayer)
      );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get upazila info with user access control
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/upazila",
  auth(["*"]),
  validates(getUpazila),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const zoneService: ZoneService = Container.get(ZoneService);
    var result: any[] = [];
    if (req.query.allUpazila)
      result = await zoneService.getUpazila(null, null, null);
    else if (req.query.district && Number(req.query.address) == 0) {
      var result1 = await zoneService.getUpazila(
        null,
        Number(req.query.district),
        null
      );
      var result2 = await zoneService.getUpazila(
        req.user.divisionId,
        req.user.districtId,
        req.user.upazilaId
      );

      var result2Id = [[result2.map((v: any) => v.upaCityId)].toString()];

      for await (const item of result1) {
        if (result2Id.includes(item.upaCityId.toString())) result.push(item);
      }
    } else if (req.query.district && Number(req.query.address) == 1) {
      result = await zoneService.getUpazila(
        null,
        Number(req.query.district),
        null
      );
    } else
      result = await zoneService.getUpazila(
        req.user.divisionId,
        req.user.districtId,
        req.user.upazilaId
      );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get union info with user access control
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/union",
  auth(["*"]),
  validates(getUnion),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const zoneService: ZoneService = Container.get(ZoneService);
    var result: any[] = [];
    if (req.query.allUnion)
      result = await zoneService.getUnion(null, null, null, req.query.type);
    else if (req.query.upazila && Number(req.query.address) == 0) {
      var result1 = await zoneService.getUnion(
        null,
        null,
        req.query.upazila,
        req.query.type
      );
      var result2 = await zoneService.getUnion(
        req.user.divisionId,
        req.user.districtId,
        req.user.upazilaId,
        req.query.type
      );

      var result2Id = [result2.map((v: any) => v.uniThanaPawId)].toString();
      for await (const item of result1) {
        if (result2Id.includes(item.uniThanaPawId.toString()))
          result.push(item);
      }
    } else if (req.query.upazila && Number(req.query.address) == 1) {
      result = await zoneService.getUnion(
        null,
        null,
        req.query.upazila,
        req.query.type
      );
    } else
      result = await zoneService.getUnion(
        req.user.divisionId,
        req.user.districtId,
        req.user.upazilaId,
        req.query.type
      );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
