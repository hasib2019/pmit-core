import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import Container from "typedi";
import EmployeeService from "../services/employee.service";
import { auth } from "../../user/middlewares/auth.middle";
import { getCode } from "../../../configs/auth.config";

const router: Router = express.Router();

/**
 * Get field officers info with user access control
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/fieldOfficer",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const employeeService: EmployeeService = Container.get(EmployeeService);
    const result = await employeeService.getFieldOfficer(
      req.query.officeId ? Number(req.query.officeId) : Number(req.user.officeId),
      req.user.userId
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get all employees of an office
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/officeEmployee",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const employeeService: EmployeeService = Container.get(EmployeeService);
    let result;

    if (req.query.officeId)
      result = await employeeService.getEmployeeList(Number(req.query.officeId), req.user.employeeId);
    else result = await employeeService.getEmployeeList(Number(req.user.officeId), req.user.employeeId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
