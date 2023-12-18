import { Application } from "express";
import ItemGroupRouter from "../inventory/routes/item-group.route";
import MeasurementUnitRouter from "../inventory/routes/measurement-unit.route";
import ItemCategoryRouter from "../inventory/routes/item-category.route";
import ItemRouter from "../inventory/routes/item.route";
import StoreRouter from "../inventory/routes/store.route";
import SupplierRouter from "../inventory/routes/supplier.route";
import AllotmentInfoRouter from "../inventory/routes/allotment-info.route";
import StoreInMigrationRouter from "../inventory/routes/store-in-migration.route";
import ItemRequisitionRouter from "../inventory/routes/item-requisition.route";
import ItemReturnRouter from "../inventory/routes/item-return.route";
export function init(app: Application) {
  app.use("/inventory", [
    ItemGroupRouter,
    MeasurementUnitRouter,
    ItemCategoryRouter,
    ItemRouter,
    StoreRouter,
    SupplierRouter,
    AllotmentInfoRouter,
    StoreInMigrationRouter,
    ItemRequisitionRouter,
    ItemReturnRouter,
  ]);
}
