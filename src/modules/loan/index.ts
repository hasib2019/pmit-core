import { Application } from "express";
import { reportRouter } from "./routes/report/report.route";
import { userLimitRouter } from "./routes/user-limit/user-limit.route";

import { productRouter } from "../loan/routes/product/product.route";
import { loanDashboardRouter } from "./routes/dashboard/dashboard.route";
import { loanPurposeRouter } from "./routes/loan-purpose/loan-purpose.route";
export function init(app: Application) {
  app.use("/report", reportRouter);
  app.use("/user-limit", userLimitRouter);
  app.use("/product", productRouter);
  app.use("/dashboard", loanDashboardRouter);
  app.use("/loan-purpose", loanPurposeRouter)
}
