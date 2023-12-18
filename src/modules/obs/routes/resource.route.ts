/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-07-25 11:53:32
 * @modify date 2023-07-25 11:53:32
 * @desc [description]
 */

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextFunction, Request, Response, Router } from "express";
import { obsBucketName } from "../../../configs/app.config";
import { s3Client } from "../../../db/obs.db";
import { wrap } from "../../../middlewares/wraps.middle";

const router = Router();

router.get(
  "/:fileName",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const getObjectCommand = new GetObjectCommand({ Bucket: obsBucketName, Key: req.params.fileName });

      const data = await s3Client.send(getObjectCommand);

      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      //@ts-ignore
      data.Body.pipe(res);
    } catch (error) {
      res.status(404).json({ error: "File not found." });
    }
  })
);

export { router as resourceRouter };
