import express, { Request, Response, NextFunction, Router } from "express";
import Container from "typedi";
import { auth } from "../../user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { BadRequestError } from "rdcd-common";
import { validates } from "../../../middlewares/express-validation.middle";
import { ItemGroupServices } from "../services/item-group.service";
import { ItemService } from "../services/item.service";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import { id } from "date-fns/locale";
import { group } from "console";
import { itemGroupValidator } from "../validators/item-group.validate";
import { itemValidator } from "../validators/item.validator";

const router: Router = express.Router();
router.get(
  "/all-doptors",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemService: ItemService = Container.get(ItemService);
    // const page: number = Number(req.query.page);
    // const limit: number = Number(req.query.limit);
    // let allQuery: any = req.query;
    // const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    // allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);
    // const count: number = await itemGroupService.count(allQuery, "master.doptor_info");
    // const pagination = new Paginate(count, limit, page);
    const data = await itemService.getDoptor();
    res.status(200).send({
      message: "request successful",

      data: data,
    });
  })
);

router.post(
  "/create-item",
  auth(["*"]),
  validates(itemValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemService: ItemService = Container.get(ItemService);
    const { userId } = req.user;
    const itemData = {
      ...req.body,
      createdBy: userId,
      createdAt: new Date(),
    };

    const result = await itemService.createItem(itemData);
    res.status(201).json({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);
router.get(
  "/get-all-item",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const itemService: ItemService = Container.get(ItemService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const { doptorId } = req.user;

    let allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);
    const count: number = await itemGroupService.count(allQuery, "inventory.item_info");
    const pagination = new Paginate(count, limit, page);
    const data = await itemService.getItemWithOrWithhoutPaginationAdQuery(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      Number(doptorId),
      "inventory.item_info"
    );
    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

router.put(
  "/update-item",
  validates(itemValidator),
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemService: ItemService = Container.get(ItemService);

    const { userId } = req.user;
    const itemData = {
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    const result = await itemService.updateItem(itemData);
    res.status(201).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে",
      data: result,
    });
  })
);
router.get(
  "/doptor-item/:itemId",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemId = req.params.itemId;
    const itemService: ItemService = Container.get(ItemService);
    const result = await itemService.getDoptorItemInfoByItemId(+itemId);
    res.status(200).json({
      message: "সফল হয়েছে",
      data: result,
    });
  })
);

export default router;
