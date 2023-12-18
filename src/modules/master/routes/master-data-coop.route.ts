/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-01-10 15:15:21
 * @modify date 2022-01-10 15:15:21
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { MasterDataAttrs } from "../interfaces/master-data.interface";
import { MasterDataServices } from "../services/master-data-coop.service";
import { validateMasterData } from "../validators/master-data-coop.validator";
import { getComponentId } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";

const router = Router();
const MasterDataService = Container.get(MasterDataServices);

router.get(
  "/approval/:dataType",

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataType = req.params.dataType;
    const data = await MasterDataService.getAprrovalDataType(dataType, req.query);
    res.status(200).send({
      message: "request successful",
      data: data,
    });
  })
);

router.get(
  "/districtOffice",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await MasterDataService.getDistrictOffice(req.user.officeId, req.user.layerId, req.user.doptorId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/upazilaOffice",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let result;
    if (req.query.districtOfficeId)
      result = await MasterDataService.getUpazilaOffice(
        req.user.officeId,
        req.user.layerId,
        req.query.districtOfficeId,
        req.user
      );
    else result = await MasterDataService.getUpazilaOffice(req.user.officeId, req.user.layerId, null);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/userDoptorInfo",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorId = req.user.doptorId;

    const doptorInfo = await MasterDataService.getUserDoptorInfo(doptorId);
    res.status(200).send({
      message: "data serve sucessfully",
      data: doptorInfo,
    });
  })
);

router.get(
  "/:dataType",
  [validates(validateMasterData, true)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataType = req.params.dataType as MasterDataAttrs;
    const type = req.query.type as string;
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;

    const allQuery: any = req.query;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.type;
    delete allQuery.isPagination;

    const count: number = await MasterDataService.count(dataType, type, allQuery);

    const pagination = new Paginate(count, limit, page);

    let data: any = await MasterDataService.get(
      dataType,
      type,
      pagination.limit,
      pagination.skip,
      allQuery,
      isPagination
    );
    data = data ? toCamelKeys(data) : data;
    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data,
    });
  })
);

router.get(
  "/doptor/list/:component",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await MasterDataService.getDoptorList(
      req.user.doptorId,
      getComponentId(req.params.component as ComponentType)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/office/layer-list",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let result;
    if (req.query.doptorId) {
      result = await MasterDataService.getOfficeLayer(Number(req.query.doptorId));
    } else {
      result = await MasterDataService.getOfficeLayer(Number(req.user.doptorId), Number(req.user.layerId));
    }
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/child/office-list",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let result;
    let doptorId = req.query.doptorId ? req.query.doptorId : req.user.doptorId;
    let officeId = req.user.officeId;
    if (req.query.layerId)
      result = await MasterDataService.getChildOffice(doptorId, officeId, Number(req.query.layerId));
    else result = await MasterDataService.getChildOffice(req.user.doptorId, req.user.officeId);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export { router as masterDataCoopRouter };
