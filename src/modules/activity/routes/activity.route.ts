/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-05-22 09:45:12
 * @modify date 2023-05-22 09:45:12
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { getComponentId } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorizationOrNoAuth } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { ActivityServices } from "../services/activity.service";

const router = Router();

router.post(
  "/:component",
  [dynamicAuthorizationOrNoAuth],
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const userType = req.user.type as "citizen" | "user";
    const { activity } = req.body;
    const componentId = getComponentId(req.params.component);
    const activityService = Container.get(ActivityServices);

    activity.ip = req.ip;
    activity.userAgent = req.get("User-Agent");

    await activityService.create({
      userId,
      userType,
      componentId,
      activity,
    });

    res.status(200).send({
      message: "request successful",
    });
  })
);
router.post("/front-end-error-log/:component", [dynamicAuthorizationOrNoAuth], wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
  const activityService = Container.get(ActivityServices)
  const userId = req.user.userId;
  const userType = req.user.type as "citizen" | "user";
  const { doptorId } = req.user
  const { error } = req.body;

  const componentId = getComponentId(req.params.component);
  const createdAt = new Date();
  const createdBy = userId;
  const errorObject = {
    message: error?.message,
    stack: error?.stack,
    componentInfo: error?.componentInfo
  }

  const errorLogObj = {

    userId: +userId,
    userType: userType,
    doptorId: +doptorId,
    componentId: +componentId,
    error: JSON.stringify(errorObject),
    createdAt: createdAt,
    createdBy: createdBy

  }
  const errorLogId = await activityService.createFrontEndErrorLog(errorLogObj);
  res.status(201).send({
    message: "Succesfull",
    data: errorLogId
  })

}))

export { router as activityRoute };
