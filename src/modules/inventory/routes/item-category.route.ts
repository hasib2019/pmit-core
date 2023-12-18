import express, { Request, Response, NextFunction, Router } from "express";
import { auth } from "../../user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { BadRequestError, messageToBangla } from "rdcd-common";
import { validates } from "../../../middlewares/express-validation.middle";
import lodash from "lodash";
import { Paginate } from "rdcd-common";
import { ItemCategoryService } from "../services/item-category.service";
import Container from "typedi";
import { ItemGroupServices } from "../services/item-group.service";

import { categoryValidator } from "../validators/item-category.validator";

const router: Router = express.Router();
router.post(
  "/create-item-category",
  auth(["*"]),
  validates(categoryValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemCategoryService: ItemCategoryService = Container.get(ItemCategoryService);
    const { groupId, categoryCode, categoryName, assetType } = req.body;
    const { userId } = req.user;
    const measurementUnitData = {
      groupId: groupId,
      categoryCode: categoryCode,
      categoryName: categoryName,
      isAsset: assetType,
      createdBy: userId,
      createdAt: new Date(),
    };
    const serviceResult = await itemCategoryService.createItemCategory(measurementUnitData);
    return res.status(201).json({
      message: "সফলভাবে তৈরি হয়েছে",
      data: serviceResult,
    });
  })
);
router.put(
  "/update-item-category",
  auth(["*"]),
  validates(categoryValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemCategoryService: ItemCategoryService = Container.get(ItemCategoryService);
    const { id, groupId, categoryCode, categoryName, assetType } = req.body;
    const { userId } = req.user;
    const measurementUnitData = {
      groupId: groupId,
      categoryCode: categoryCode,
      categoryName: categoryName,
      isAsset: assetType,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    const serviceResult = await itemCategoryService.updateItemCategory(measurementUnitData, id);
    return res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে",
      data: serviceResult,
    });
  })
);
router.get(
  "/all-item-category",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const itemGroupService: ItemGroupServices = Container.get(ItemGroupServices);
    const itemCategoryService: ItemCategoryService = Container.get(ItemCategoryService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    let allQuery: any = req.query;
    allQuery = lodash.omit(allQuery, ["page", "limit", "isPagination"]);
    const count: number = await itemGroupService.count(allQuery, "inventory.item_category");
    const pagination = new Paginate(count, limit, page);
    const data = await itemCategoryService.getAllCategoryWithOrWithoutPagination(
      isPagination,
      limit,
      pagination.skip,
      allQuery
    );
    res.status(200).json({
      message: "Request Successfull",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

export default router;
