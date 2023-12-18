import { Application } from "express";
import { apiTestRouter } from "./routes/test.route";
import { memberFinancialRouter } from "./routes/member-financial.route";
import { externalTransactionRouter } from "./routes/external-transaction.route";

export function init(app: Application) {
  app.use("/test-api", apiTestRouter);
  app.use("/external/member-financial", memberFinancialRouter);
  app.use("/external/transaction", externalTransactionRouter);
}
