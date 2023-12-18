import { NextFunction, Request, Response, Router } from "express";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import serviceWiseDocMapMiddle from "../middlewares/service-wise-doc-map.middle";
import ServiceWiseDocuments from "../services/service-wise-documents.service";
import { serviceWiseDocMapping } from "../validators/service-wise-documents.validator";

const router = Router();

router.post(
  "/",
  auth(["*"]),
  validates(serviceWiseDocMapping),
  serviceWiseDocMapMiddle,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const serviceWiseDocuments = Container.get(ServiceWiseDocuments);

    const response = await serviceWiseDocuments.serviceWiseDocMapping({
      ...req.body,
      doptorId: req.user.doptorId,
      createdBy: req.user.userId,
    });

    res.status(Number(response.statusCode)).send({
      message: response.message,
      data: response.result,
    });
  })
);

router.get(
  "/",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const serviceWiseDocuments = Container.get(ServiceWiseDocuments);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    allQuery = lodash.omit(allQuery, ["page", "limit", "isPagination"]);

    const count: number = await serviceWiseDocuments.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const result = await serviceWiseDocuments.getServiceWiseDocMapping(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery
    );

    res.status(200).send({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
