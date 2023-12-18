import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import SanctionService from "../services/sanction.service";
import { getSanctionDocValidator, getSanctionMessageValidator } from "../validators/sanction.validator";

const router: Router = express.Router();

/**
 * Get product list
 * Author: Rukaiya
 * Updater: Adnan
 */
router.get(
  "/product",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const sanctionService: SanctionService = Container.get(SanctionService);
    const result = await sanctionService.getProductList(
      req.query.doptorId ? Number(req.query.doptorId) : Number(req.user.doptorId),
      req.query.projectId ? Number(req.query.projectId) : null,
      req.query.productType ? String(req.query.productType) : null,
      req.query.depositNature ? String(req.query.depositNature) : null
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get message
 * Author: Rukaiya
 * Updater: Adnan
 */
router.get(
  "/message",
  auth(["*"]),
  validates(getSanctionMessageValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const sanctionService: SanctionService = Container.get(SanctionService);
    const result = await sanctionService.getMessage(
      Number(req.query.id),
      Number(req.query.projectId),
      Number(req.query.productId)
    );
    return res.status(200).json({
      message: "Request Successfull",
      data: result,
    });
  })
);

/**
 * Get document type
 * Author: Rukaiya
 * Updater: Adnan
 */
router.get(
  "/documentType",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const sanctionService: SanctionService = Container.get(SanctionService);
    const result = await sanctionService.getDocumentType(
      Number(req.user.doptorId),
      Number(req.query.projectId),
      Number(req.query.productId),
      Number(req.query.customerId)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get given document
 * Author: Adnan
 * Updater:
 */
router.get(
  "/givenDoc",
  auth(["*"]),
  validates(getSanctionDocValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const sanctionService: SanctionService = Container.get(SanctionService);
    const result = await sanctionService.getGivenDoc(
      Number(req.user.doptorId),
      Number(req.query.projectId),
      Number(req.query.productId),
      Number(req.query.customerId)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
