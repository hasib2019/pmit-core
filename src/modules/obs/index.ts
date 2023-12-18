import { Application } from "express";
import { resourceRouter } from "./routes/resource.route";

export function init(app: Application) {
  app.use("/uploads", resourceRouter);
}
