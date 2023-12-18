import express, { NextFunction, Request, Response, Router } from "express";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { LoanDashboardServices } from "../../services/dashboard/dashboard.service";
import { Paginate } from "rdcd-common";

const router: Router = express.Router();

router.post(
  "/",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dashbBoardServices = Container.get(LoanDashboardServices);

    const dashBoardData = await dashbBoardServices.insertLoanDashboardData();

    return res.status(200).send({
      message: "Request successful",
      dashBoardData,
    });
  })
);

router.get(
  "/",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorId = req.query.doptorId ? req.query.doptorId : req.user.doptorId;
    const officeId = req.query.officeId ? req.query.officeId : req.user.officeId;
    const projectId = req.query.projectId ? [req.query.projectId] : req.user.projects;
    const dashbBoardServices = Container.get(LoanDashboardServices);

    const allQuery: any = req.query;
    const data = await dashbBoardServices.get(allQuery, doptorId, officeId, projectId);

    res.status(200).send({
      message: "Request successful",
      data,
    });
  })
);

export { router as loanDashboardRouter };
