import Express, { Request, Response, NextFunction, Router } from "express";
import Container from "typedi";
import { auth } from "../../user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { validates } from "../../../middlewares/express-validation.middle";
import { AllotmentInfoService } from "../services/allotment-info.service";
import { ItemGroupServices } from "../services/item-group.service";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import { upsertValidator } from "../validators/upsert-allotment.validator";

const router: Router = Express.Router();

router.get(
  "/allotment-info/:layerId/:unitId",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const allotmentInfoService: AllotmentInfoService = Container.get(AllotmentInfoService);
    const { layerId, unitId } = req.params;
    const result = await allotmentInfoService.getAllotmentInfo(Number(layerId), unitId ? Number(unitId) : undefined);
    return res.status(200).json({
      data: result,
      message: "Successfull",
    });
  })
);
router.get(
  "/office-origin",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const allotmentService: AllotmentInfoService = Container.get(AllotmentInfoService);
    const { doptorId } = req?.user;
    const result = await allotmentService.getOfficeOrigin(+doptorId);
    return res.status(200).json({
      data: result,
      message: "Successfull",
    });
  })
);
router.get(
  "/all-office-unit",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const allotmentInfoService: AllotmentInfoService = Container.get(AllotmentInfoService);
    const { doptorId } = req?.user;
    const result = await allotmentInfoService.getAllOfficeUnitByDoptor(+doptorId);
    return res.status(200).json({
      data: result,
      message: "Successfull",
    });
  })
);
router.post(
  "/insert-update-allotment",
  auth(["*"]),
  validates(upsertValidator, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const allotmentService: AllotmentInfoService = Container.get(AllotmentInfoService);

    const { userId } = req?.user;
    const result = await allotmentService.upsertAllotment(req.body, userId);
    return res.status(201).json({
      data: result,
      message: "সফলভাবে সংরক্ষণ হয়েছে",
    });
  })
);

export default router;
