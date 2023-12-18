import { NextFunction, Request, Response, Router } from "express";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { OfficeInfoServices } from "../services/office-info-coop.service";
import { validateOfficeInfoOrigin } from "../validators/office-info.validator";

const router = Router();
const OfficeInfoService = Container.get(OfficeInfoServices);

router.get(
  "/",
  dynamicAuthorization,
  // validates(validateOfficeInfo),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let data = {};
    const doptorId = req.user.doptorId;
    if (req.query.userOffice) {
      if (req.user.type == "user") {
        data = await OfficeInfoService.get(0, 0, { id: req.user.officeId }, false, doptorId);
      }
    } else {
      const page: number = Number(req.query.page);
      const limit: number = Number(req.query.limit);
      const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
      const allQuery: any = req.query;
      delete allQuery.page;
      delete allQuery.limit;
      delete allQuery.type;
      delete allQuery.isPagination;

      const count: number = await OfficeInfoService.count(allQuery);

      const pagination = new Paginate(count, limit, page);

      data = await OfficeInfoService.get(pagination.limit, pagination.skip, allQuery, isPagination, doptorId);
    }

    // const result = await OfficeInfoService.get(req.query);
    res.status(200).send({
      message: "Data Serve Successfully",
      data: data ? data : {},
    });
  })
);

router.get(
  "/:origin",
  validates(validateOfficeInfoOrigin),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const origin = req.params.origin ? parseInt(req.params.origin) : null;
    const result = await OfficeInfoService.getByOrigin(origin);
    res.status(200).send({
      message: "Data Serve Successfully",
      data: result ? result : {},
    });
  })
);

export { router as officeInfoRouter };
