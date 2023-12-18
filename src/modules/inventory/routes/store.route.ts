import Express, { Request, Response, NextFunction, Router } from "express";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { StoreService } from "../services/store.service";
import { ItemGroupServices } from "../services/item-group.service";
import { ItemService } from "../services/item.service";
import lodash from "lodash";
import { validates } from "../../../middlewares/express-validation.middle";
import { storeValidator } from "../validators/store.validator";
const router: Router = Express.Router();

router.post(
  "/create-store",
  auth(["*"]),
  validates(storeValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const storeService: StoreService = Container.get(StoreService);
    const { userId, doptorId } = req.user;
    const storeData = req.body;
    storeData.createdBy = userId;
    storeData.createdAt = new Date();
    storeData.doptorId = doptorId;

    const result = await storeService.createStore(storeData);

    return res.status(201).json({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);
router.put(
  "/update-store",
  auth(["*"]),
  validates(storeValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const storeService: StoreService = Container.get(StoreService);
    const { userId } = req.user;
    const storeData = req.body;
    storeData.updatedBy = userId;
    storeData.updatedAt = new Date();

    const result = await storeService.updateStore(storeData);

    return res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/get-store",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const storeService: StoreService = Container.get(StoreService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);
    const count: number = await itemGroupService.count(allQuery, "inventory.store_info");
    const pagination = new Paginate(count, limit, page);
    const officeId = req.user?.officeId;
    const data = await storeService.getStoreWithOrWithhoutPaginationAdQuery(
      officeId,
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      "inventory.store_info"
    );
    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

export default router;
