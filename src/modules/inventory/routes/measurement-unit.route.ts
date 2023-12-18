import express, { Request, Response, NextFunction, Router } from "express";
import { auth } from "../../user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { BadRequestError, messageToBangla } from "rdcd-common";
import { validates } from "../../../middlewares/express-validation.middle";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import { MeasurementUnitService } from "../services/measurement-unit.service";
import Container from "typedi";
import { ItemGroupServices } from "../services/item-group.service";
import { measurementUnitValidator } from "../validators/measurement-unit.validator";
const router: Router = express.Router();
router.post(
  "/create-measurement-unit",
  auth(["*"]),
  validates(measurementUnitValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const measurementUnitService: MeasurementUnitService = Container.get(MeasurementUnitService);
    const { unitName, isActive } = req.body;
    const { userId } = req.user;
    const measurementUnitData = {
      mouName: unitName,
      isActive: isActive,
      createdBy: userId,
      createdAt: new Date(),
    };
    const serviceResult = await measurementUnitService.createMeasurementUnit(measurementUnitData);
    return res.status(201).json({
      message: "সফলভাবে তৈরি হয়েছে",
      data: serviceResult,
    });
  })
);
router.put(
  "/update-measurement-unit",
  validates(measurementUnitValidator),
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const measurementUnitService: MeasurementUnitService = Container.get(MeasurementUnitService);
    const { id, unitName, isActive } = req.body;
    const { userId } = req.user;
    const measurementUnitData = {
      mouName: unitName,
      isActive: isActive,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    const serviceResult = await measurementUnitService.updateMeasurementUnit(measurementUnitData, id);
    return res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে",
      data: serviceResult,
    });
  })
);
router.get(
  "/all-measurement-unit",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    let allQuery: any = req.query;
    allQuery = lodash.omit(allQuery, ["page", "limit", "isPagination"]);
    const count: number = await itemGroupService.count(allQuery, "inventory.measurement_unit");
    const pagination = new Paginate(count, limit, page);
    const data = await itemGroupService.getItemByTableNameWithOptionalPaginationAndQuery(
      isPagination,
      limit,
      pagination.skip,
      allQuery,
      "inventory.measurement_unit"
    );
    res.status(200).json({
      message: "Request Successfull",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);
export default router;
