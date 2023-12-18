import { Application } from "express";
import doptorRouter from "./routes/doptor.route";
import { employeeRecordRouter } from "./routes/employee-record.route";
import employeeRouter from "./routes/employee.route";
import holidayRoute from "./routes/holiday-setup.route";
import { masterDataCoopRouter } from "./routes/master-data-coop.route";
import dataRouter from "./routes/master-data.route";
import materializedView from "./routes/materialized-view-update";
import { officeInfoRouter } from "./routes/office-info.route";
import { officeOriginUnitRouter } from "./routes/office-origin-unit.route";
import { officeOriginRouter } from "./routes/office-origin.route";
import projectRouter from "./routes/project.route";
import { samityDocRouter } from "./routes/samity-doc-type.route";
import serviceWiseDocuments from "./routes/service-wise-documents.route";
import zoneRouter from "./routes/zone.route";

export function init(app: Application) {
  app.use("/coop/samity-doc-type", samityDocRouter);
  app.use("/coop/master-data/office-origin-unit", officeOriginUnitRouter);
  app.use("/coop/master-data/employee-record", employeeRecordRouter);
  app.use("/coop/master-data/office-origin", officeOriginRouter);
  app.use("/coop/master-data/office-info", officeInfoRouter);
  app.use("/coop/master-data", masterDataCoopRouter);
  app.use("/master/project", projectRouter);
  app.use("/master/doptor", doptorRouter);
  app.use("/master/zone", zoneRouter);
  app.use("/master/employee", employeeRouter);
  app.use("/master/data", dataRouter);
  app.use("/master/mv", materializedView);
  app.use("/master/serviceWiseDocuments", serviceWiseDocuments);
  app.use("/holiday-setup", holidayRoute);
}
