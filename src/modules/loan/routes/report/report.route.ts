import { Router, Request, Response, NextFunction } from "express";
import { toCamelKeys } from "keys-transform";
import { Paginate } from "rdcd-common";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import ReportServices from "../../services/report.service";
import { getCode } from "../../../../configs/auth.config";

const router = Router();
const ReportService = Container.get(ReportServices);

router.get(
  "/",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;

    const count: number = await ReportService.count(allQuery);

    const pagination = new Paginate(count, limit, page);

    let pageInfo: any = await ReportService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    pageInfo = pageInfo.map((element: any) => {
      return {
        userName: req.user.userId,
        doptorId: req.user.doptorId,
        ...element,
      };
    });

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: pageInfo ? toCamelKeys(pageInfo) : pageInfo,
    });
  })
);

export { router as reportRouter };
