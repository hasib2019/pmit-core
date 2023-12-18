import express, { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { pageCheck } from "../../../application/middlewares/page-check.middle";
import Container from "typedi";
import { getCode } from "../../../../configs/auth.config";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../user/middlewares/auth.middle";
import { ProductService } from "../../services/product/product.service";
import { Paginate } from "rdcd-common";
import { productCreateUpdateValidator } from "../../validators/svings-product-create-update.validator";
import productUpdateMiddleware from "../../middlewares/product-update.middle";

const router: Router = express.Router();

router.post(
  "/createSavingsProduct",

  [auth(["*"])],
  productCreateUpdateValidator,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const data = req.body;
    data.doptorId = req.user.doptorId;

    data.createdBy = req.user.userId;
    data.productType = "L";
    data.depositNature = "L";
    data.createdAt = new Date();
    const result: any = await productService.createSavingsProduct(data);
    res.status(201).json({
      message: "সফলভাবে তৈরী হয়েছে",
      data: {
        id: result?.id ?? null,
      },
    });
  })
);
router.put(
  "/updateSavingsProduct/:id",
  [auth(["*"])],
  productCreateUpdateValidator,
  productUpdateMiddleware,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const data = req.body;
    const id = parseInt(req.params.id);

    data.updatedAt = new Date();
    data.updatedBy = req.user.userId;
    const updateData: any = await productService.updateSavingsProduct(data, id);
    res.status(200).json({
      message: "সফলভাবে হালদানাগাদ হয়েছে ",
      data: {
        id: updateData?.id ?? null,
      },
    });
  })
);

router.get(
  "/",
  [auth(["*"])],
  pageCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;
    const count: number = await productService.count(allQuery);
    const pagination = new Paginate(count, limit, page);
    const data = await productService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

/**
 * Get single product details
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/singleProduct",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const result = await productService.getSingleProductDetails(Number(req.query.productId));
    return res.status(200).json({
      message: "Request Successful",
      data: [result],
    });
  })
);

router.get(
  "/projectWiseProduct",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const projectIds = req.user.projects;
    const doptorId = req.user.doptorId;
    const result = await productService.getProjectWiseProduct(projectIds, doptorId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/serCrgSegList",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const result = await productService.getSegregatioList(Number(req.user.doptorId));
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get charge type list
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/chargeTypeList",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const productService: ProductService = Container.get(ProductService);
    const result = await productService.getChargeTypes();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
export { router as productRouter };
