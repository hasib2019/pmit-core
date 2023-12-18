import Express, { Request, Response, NextFunction, Router } from "express";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import Container from "typedi";
import { SupplierAttr } from "../interfaces/supplier.interface";
import { SupplierService } from "../services/supplier.service";
import { Paginate, RequestValidationError } from "rdcd-common";
import { ItemGroupServices } from "../services/item-group.service";
import { StoreService } from "../services/store.service";
import lodash from "lodash";
import { validates } from "../../../middlewares/express-validation.middle";
import { supplierValidator } from "../validators/supplier.validator";
const router: Router = Express.Router();

router.post(
  "/supplier-create",
  auth(["*"]),
  validates(supplierValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const supplierService = Container.get(SupplierService);
    const { userId, doptorId, officeId } = req.user;
    const supplierData = req.body;
    supplierData.doptorId = doptorId;
    supplierData.officeId = officeId;
    supplierData.createdBy = userId;
    supplierData.createdAt = new Date();
    const result = await supplierService.createSupplier(supplierData);
    return res.status(201).json({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.put(
  "/supplier-update",
  auth(["*"]),
  validates(supplierValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const supplierService = Container.get(SupplierService);
    const { userId, doptorId, officeId } = req.user;
    const supplierData = req.body;
    supplierData.doptorId = doptorId;
    supplierData.officeId = officeId;
    supplierData.createdBy = userId;
    supplierData.createdAt = new Date();
    const result = await supplierService.updateSupplier(supplierData);
    return res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে",
      data: result,
    });
  })
);
router.get(
  "/get-supplier",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const supplierService: SupplierService = Container.get(SupplierService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);
    const count: number = await itemGroupService.count(allQuery, "inventory.supplier_info");
    const pagination = new Paginate(count, limit, page);
    const doptorId = req?.user?.doptorId;
    const data = await supplierService.getSupplier(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      "inventory.supplier_info",
      +doptorId
    );
    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);
export default router;
