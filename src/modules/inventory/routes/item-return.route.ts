import { NextFunction, Router, Request, Response } from "express";
import Container from "typedi";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { ItemReturnService } from "../services/item-return.service";

const router: Router = Router();
router.get(
  "/returnable-items",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { employeeId } = req.user;
    const itemReturnService: ItemReturnService = Container.get(ItemReturnService);
    const returnableItems = await itemReturnService.getReturnableItems(employeeId);
    res.status(200).send({
      message: "Successfull",
      data: returnableItems,
    });
  })
);
router.get(
  "/non-fixed-returnable-items",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { employeeId } = req.user;
    const itemReturnService: ItemReturnService = Container.get(ItemReturnService);
    const nonFixedReturnableItems = await itemReturnService.getNonFixedReturnableItems(employeeId);
    res.status(200).send({
      message: "Successfull",
      data: nonFixedReturnableItems,
    });
  })
);
export default router;
