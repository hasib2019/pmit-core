import { Application } from "express";
import { dpsRouter } from "./routes/dps.route";
import { fdrRouter } from "./routes/fdr.route";
import { savingsRouter } from "./routes/savings.route";

export function init(app: Application) {
  app.use("/dps", dpsRouter);
  app.use("/fdr", fdrRouter);
  app.use("/savings", savingsRouter);
}
