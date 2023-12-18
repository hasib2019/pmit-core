import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { EmployeeRecordServices } from "../services/employee-record.service";
import { validateEmployeeRecord } from "../validators/employee-record.validate";


const router = Router();
const EmployeeRecordService = Container.get(EmployeeRecordServices);
router.get(
  "/by-employee-office/:officeId",
  validates(validateEmployeeRecord),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await EmployeeRecordService.get(Number(req.params.officeId));
    res.status(200).send({
      message: "Data Serve Successfully",
      data: result,
    });
  })
);

export { router as employeeRecordRouter };
