import { Application } from "express";
import { samityMigrationRouter } from "./routes/samity-migration.route";

export function init(app: Application) {
  app.use("/migration", [samityMigrationRouter]);
}
