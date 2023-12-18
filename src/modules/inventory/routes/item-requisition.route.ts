import Express, { Router, Request, Response, NextFunction } from "express";
const router: Router = Express.Router();
import Container from "typedi";
import { auth } from "../../user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { validates } from "../../../middlewares/express-validation.middle";
import { ItemRequisitionService } from "../services/item-requisition.service";

router.get(
  "/requisition-purpose",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemRequisitionService: ItemRequisitionService = Container.get(ItemRequisitionService);
    const { doptorId } = req.user;
    const result = await itemRequisitionService.getRequisitionPurpose(+doptorId);
    return res.status(200).json({
      message: "Successfull",
      data: result,
    });
  })
);
router.get("/isStoreAdmin", auth(["*"]), wrap(async (req: Request, res: Response, next: NextFunction) => {
  const itemRequisitionService: ItemRequisitionService = Container.get(ItemRequisitionService);
  const { designationId } = req?.user;
  const isStoreAdmin = await itemRequisitionService.isStoreAdmin(+designationId);
  res.status(200).send({
    isStoreAdmin: isStoreAdmin
  })
}));
router.get("/get-store-admin-info", auth(["*"]), wrap(async (req: Request, res: Response, next: NextFunction) => {
  const itemRequisitionService: ItemRequisitionService = Container.get(ItemRequisitionService);
  const { officeId } = req?.user;
  const storeAdminDesignationId = await itemRequisitionService.getStoreAdminInfo(officeId);
  res.status(200).send({
    data: storeAdminDesignationId
  })


}))
export default router;
