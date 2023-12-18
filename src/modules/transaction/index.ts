import { Application } from "express";
import { dayOpenCloseRouter } from "./routes/day-open-close.route";
import { serviceChargeRouter } from "./routes/service-charge.route";
import transactionRouter from "./routes/transaction.route";

export function init(app: Application) {
  app.use("/transaction", transactionRouter);
  app.use("/service-charge", serviceChargeRouter);
  app.use("/day-open-close", dayOpenCloseRouter);
}
