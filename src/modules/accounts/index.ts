import { Application } from "express";
import { holidayRouter } from "./routes/holiday-setup.route";
import { ledgerRouter } from "./routes/ledger.route";
import { voucherRouter } from "./routes/voucher-posting.route";

export function init(app: Application) {
  app.use("/accounts/holiday", holidayRouter);
  app.use("/accounts/voucher", voucherRouter);
  app.use("/accounts/ledger", ledgerRouter);
}
