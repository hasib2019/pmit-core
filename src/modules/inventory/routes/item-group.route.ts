import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { auth } from "../../user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { BadRequestError } from "rdcd-common";
import { validates } from "../../../middlewares/express-validation.middle";
import { ItemGroupServices } from "../services/item-group.service";
import { ItemGroupAttributes } from "../interfaces/item-group.interface";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import { itemGroupValidator } from "../validators/item-group.validate";
const router: Router = express.Router();

router.post(
  "/create-item-group",
  auth(["*"]),
  validates(itemGroupValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const { groupName } = req.body;
    const { userId } = req.user;
    const itemGroupData = {
      groupName: groupName,
      createdBy: userId,
      createdAt: new Date(),
    };
    const serviceResult = await itemGroupService.createGroup(itemGroupData);
    res.status(201).json({
      message: "সফলভাবে তৈরি হয়েছে",
      data: serviceResult,
    });
  })
);
router.put(
  "/update-item-group",
  auth(["*"]),
  validates(itemGroupValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const { groupName, id } = req.body;
    const itemGroupData = {
      groupName: groupName,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
    };
    const result = await itemGroupService.updateGroup(itemGroupData, Number(id));
    return res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/all-items-groups",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);
    const count: number = await itemGroupService.count(allQuery, "inventory.item_group");
    const pagination = new Paginate(count, limit, page);
    const data = await itemGroupService.getItemByTableNameWithOptionalPaginationAndQuery(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      "inventory.item_group"
    );
    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

export default router;
