import { Application } from "express";
import { vmsRouter } from "./routes/driverList/driverlist.route";
export function init(app: Application) {

    app.use("/vms", vmsRouter)
}
