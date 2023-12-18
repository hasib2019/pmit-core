import { NextFunction, Request, Response, Router } from "express";
import { toCamelCase, toCamelKeys } from "keys-transform";
import { auth } from "../../../user/middlewares/auth.middle";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { UserLimitServices } from "../../services/user-limit/user-limit.service";
import { validates } from "../../../../middlewares/express-validation.middle";
import {
  createUserLimitValidator,
  getUserLimitValidator,
} from "../../validators/user-limit.validator";

const router = Router();
const UserLimitService = Container.get(UserLimitServices);

router.post(
  "/",
  [auth(["*"])],
  validates(createUserLimitValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const bodyData = req.body;

    const doptorId = req.user.doptorId;
    const result = await UserLimitService.create({
      ...bodyData,
      doptorId,
      createdBy: req.user.userId,
    });

    res.status(201).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/",
  auth(["*"]),
  validates(getUserLimitValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let result;
    if (Number(req.query.status) == 1) {
      result = await UserLimitService.get(
        Number(req.query.projectId),
        null,
        Number(req.query.roleId),
        Number(req.query.status)
      );
    } else if (Number(req.query.status) == 2) {
      result = await UserLimitService.get(
        Number(req.query.projectId),
        Number(req.query.userId),
        null,
        Number(req.query.status)
      );
    }

    res.status(200).send({
      message: "Request Successful",
      data: result ? toCamelKeys(result) : result,
    });
  })
);

export { router as userLimitRouter };
