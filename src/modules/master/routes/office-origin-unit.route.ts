import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { OfficeOriginUnitServices } from "../services/office-origin-unit.service";

const OfficeOriginUnitService = Container.get(OfficeOriginUnitServices);
const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const result = await OfficeOriginUnitService.get();
  res.status(200).send({
    message: "Data Serve Successfully",
    data: result,
  });
});

export { router as officeOriginUnitRouter };
