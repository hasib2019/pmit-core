import Express, { Request, Response, NextFunction, Router } from "express";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import Container from "typedi";
import { StoreInMigrationService } from "../services/store-in-migration.service";
import { StoreInMigrationAttributes } from "../interfaces/store-in-migration.interface";

const router: Router = Express.Router();
router.get(
  "/get-item-for-excel",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const storeInMigrationService: StoreInMigrationService = Container.get(StoreInMigrationService);
    const result = await storeInMigrationService.getItemForExcel();
    return res.status(200).json({
      data: result,
      message: "সফল হয়েছে",
    });
  })
);

export default router;
