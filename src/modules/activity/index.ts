/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-05-22 09:50:08
 * @modify date 2023-05-22 09:50:08
 * @desc [description]
 */


import { Application } from "express";
import { activityRoute } from "./routes/activity.route";

export function init(app: Application) {
  app.use("/activity", activityRoute);
}
