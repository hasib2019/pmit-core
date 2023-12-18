/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-07-25 11:53:32
 * @modify date 2023-07-25 11:53:32
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { multerUpload } from "rdcd-common";
import { wrap } from "../../../middlewares/wraps.middle";
import { obsUpload } from "../../../utils/obs.util";
import { authExternalAPI } from "../middlewares/api-user-auth.middleware";
const router = Router();

router.get(
  "/test",
  [authExternalAPI],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    res.send("ok");
  })
);

router.post(
  "/upload",
  multerUpload.fields([
    {
      name: "documentName",
      maxCount: 1,
    },
  ]),
  obsUpload,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log({ req });

    res.send();
  })
);

export { router as apiTestRouter };
