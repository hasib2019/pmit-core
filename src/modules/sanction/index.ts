import { Application } from "express";
import sanctionRouter from './routes/sanction.route'


export function init(app: Application) {
    app.use('/sanction', sanctionRouter);
}