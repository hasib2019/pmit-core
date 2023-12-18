import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import Container from "typedi";
import { MaterializedViewService } from "../services/mv-update.service";

const router: Router = express.Router();

/**
 * Materialized View Update
 * Author: Adnan
 * Updater:
 */
router.put(
  "/materializedView",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const materializedViewService: MaterializedViewService = Container.get(
      MaterializedViewService
    );
    const result = await materializedViewService.materializedView();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
