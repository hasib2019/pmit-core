import { NextFunction, Request, Response, Router } from "express";
import { validates } from "../../../../middlewares/express-validation.middle";
import Container from "typedi";
import { wrap } from "../../../..//middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import { VehicleServices } from "../../services/driverlist/driverlist.service";
import { createDriverlist, vehicleInclusion, petropumpInclusion } from './../../validators/vms.validator';


const router = Router();

//driver route
router.get(
  "/get-driverlist",
  [auth(["*"])],

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleServices: VehicleServices = Container.get(VehicleServices)
    const result = await vehicleServices.getDriverList()

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });}));

router.post(
  "/create-driverlist",
  [auth(["*"])],
  validates(createDriverlist),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleServices: VehicleServices = Container.get(VehicleServices)

    const response = await vehicleServices.createDriver({ ...req.body,doptorId: req.user.doptorId, createdBy: req.user.userId });

    res.status(201).send({
      message: response?.message,
      data: response?.result
    });
  })
);



//vehicle route

router.get(
  "/get-vehicle",
  [auth(["*"])],

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleServices: VehicleServices = Container.get(VehicleServices)
    const result = await vehicleServices.getVehicle()

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });}));

router.post(
  "/create-vehicle",
  [auth(["*"])],
  validates(vehicleInclusion),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleServices: VehicleServices = Container.get(VehicleServices)
    const response = await vehicleServices.createVehicle({ ...req.body,doptorId: req.user.doptorId, createdBy: req.user.userId });
    res.status(201).send({
      message: response?.message,
      data: response?.result
    });
  })
);


//petrol pump route 

router.post(
  "/create-pump",
  [auth(["*"])],
  validates(petropumpInclusion),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleServices: VehicleServices = Container.get(VehicleServices)
    const response = await vehicleServices.createPump({ ...req.body,doptorId: req.user.doptorId, createdBy: req.user.userId });
    res.status(201).send({
      message: response?.message,
      data: response?.result
    });
  })
);


router.get(
  "/get-pump",
  [auth(["*"])],

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleServices: VehicleServices = Container.get(VehicleServices)
    const result = await vehicleServices.getPetrolPump()

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });}));


export { router as vmsRouter };