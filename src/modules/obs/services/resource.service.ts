/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-08-06 15:08:42
 * @modify date 2023-08-06 15:08:42
 * @desc [description]
 */

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Service } from "typedi";
import { obsBucketName } from "../../../configs/app.config";
import { s3Client } from "../../../db/obs.db";

@Service()
export default class ResourceServices {
  constructor() {}

  async getObject(key: string, bucket: string = obsBucketName) {
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });

    try {
      const { Body } = await s3Client.send(getObjectCommand);
      const data = Body?.transformToWebStream();

      console.log({ Body, data });

      return data;
    } catch (err) {
      console.log(err);
      return;
    }
  }
}
