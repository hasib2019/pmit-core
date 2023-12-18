import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import Container from "typedi";
import DoptorService from "../services/doptor.service";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { getComponentId } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";

const router: Router = express.Router();

router.get(
  "/:component",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorService: DoptorService = Container.get(DoptorService);
    const result = await doptorService.getDoptorList(
      req.user.doptorId,
      getComponentId(req.params.component as ComponentType)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
