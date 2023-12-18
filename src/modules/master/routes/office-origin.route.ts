import { NextFunction, Request, Response, Router } from "express";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { OfficeOriginServices } from "../services/office-origin.service";

const router = Router();
const OfficeOriginService = Container.get(OfficeOriginServices);

router.get(
  "/",
  dynamicAuthorization,
  // validates(validateOfficeInfo),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let data = {};

    if (req.query.userOrigin) {
      if (req.user.type == "user") {
        data = await OfficeOriginService.getOriginRecursive(req.user.doptorId);
      }
    } else if (req.query.userOfficeOrigin) {
      if (req.user.type == "user") {
        data = await OfficeOriginService.userOfficeOrigin(req.user.officeId);
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

      const count: number = await OfficeOriginService.count(allQuery);

      const pagination = new Paginate(count, limit, page);

      data = await OfficeOriginService.get(pagination.limit, pagination.skip, allQuery, isPagination);
    }

    // const result = await OfficeInfoService.get(req.query);
    res.status(200).send({
      message: "Data Serve Successfully",
      data: data ? data : {},
    });
  })
);

export { router as officeOriginRouter };
