import { Application } from "express";
import samityRouter from './routes/samity.route'


export function init(app: Application) {
    app.use('/samity', samityRouter);
}