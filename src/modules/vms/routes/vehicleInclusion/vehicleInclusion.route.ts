import { NextFunction, Request, Response, Router } from "express";
import { validates } from "../../../../middlewares/express-validation.middle";
import Container from "typedi";
import { wrap } from "../../../..//middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import { VehicleServices } from "../../services/driverlist/driverlist.service";
import { vehicleInclusion } from './../../validators/vms.validator';



const router = Router();

router.post(
  "/create-vehicle",
  [auth(["*"])],
  validates(vehicleInclusion),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log("create-vehicle");
    const vehicleServices: VehicleServices = Container.get(VehicleServices)
    const response = await vehicleServices.createVehicle({ ...req.body,doptorId: req.user.doptorId, createdBy: req.user.userId });
    res.status(201).send({
      message: response?.message,
      data: response?.result
    });
  })
);

export { router as vmsRouter };






