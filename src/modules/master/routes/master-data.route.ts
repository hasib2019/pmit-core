import express, { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { MasterDataServices } from "../services/master-data-coop.service";
import DataService from "../services/master-data.service";
import OfficeService from "../services/office.service";
import { getBankInfo, getFieldsData } from "../validators/master-data.validator";

const router: Router = express.Router();

/**
 * Get all code master data
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/codeMaster",
  // validates(getCodeMasterData),
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const codeType: any = req.query.codeType;
    const result = await dataService.getCodeMasterData(codeType.toString(), undefined);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get all document types
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/docType",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);

    const result = await dataService.getDocTypes();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get all fields details
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/fieldData",
  validates(getFieldsData),
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const pageName: any = req.query.pageName;
    const result = await dataService.getFieldsData(pageName.toString(), req.user.doptorId, Number(req.query.project));
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get own office
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/office",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const officeService: OfficeService = Container.get(OfficeService);

    const result = await officeService.getOffice(req.user.officeId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get permitted division office
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/divisionOffice",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);

    const result = await dataService.getDivisionOffice(req.user.officeId, req.user.layerId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get permitted district office
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/districtOffice",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);

    const result = await dataService.getDistrictOffice(req.user.officeId, req.user.layerId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get permitted upazila office
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/upazilaOffice",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    let result;
    if (req.query.districtOfficeId)
      result = await dataService.getUpazilaOffice(req.user.officeId, req.user.layerId, req.query.districtOfficeId);
    else result = await dataService.getUpazilaOffice(req.user.officeId, req.user.layerId, null);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get loan purpose
 * Author: Rukaiya
 * Updater:
 * authId:
 */
router.get(
  "/loanPurpose",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const officeService: OfficeService = Container.get(OfficeService);

    const result = await officeService.getLoanPurpose(Number(req.user.doptorId), Number(req.query.projectId));
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * get doptor wise office list
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/childOfficeList",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const officeService: OfficeService = Container.get(OfficeService);
    let result;
    let doptorId = req.query.doptorId ? req.query.doptorId : req.user.doptorId;
    let officeId = req.user.officeId;
    if (req.query.layerId) result = await officeService.getChildOffice(doptorId, officeId, Number(req.query.layerId));
    else result = await officeService.getChildOffice(req.user.doptorId, req.user.officeId);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
router.get(
  "/officeList/inventory",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const officeService: OfficeService = Container.get(OfficeService);
    let result;
    if (req.query.layer)
      result = await officeService.getDoptorOfficeForInventory(
        req.user.doptorId,
        Number(req.query.layer),
        Number(req.user.divisionId),
        Number(req.user.districtId),
        Number(req.user.upazilaId)
      );
    else
      result = await officeService.getDoptorOfficeForInventory(undefined, undefined, undefined, undefined, undefined);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
router.get(
  "/unit-list",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const officeService: OfficeService = Container.get(OfficeService);
    const officeId = req.query?.officeId;
    let result;

    result = await officeService.getUnitOfOffice(Number(officeId));

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
/**
 * get user doptor details
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/doptorDetails",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const result = await dataService.getDoptorDetails(req.user.doptorId);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/officeOrigin",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const result = await dataService.getOfficeOrigin(req.user.doptorId);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/officeInfo",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    let result = [];

    if (req.query.officeFromToken) {
      result = await dataService.getOfficeInfo(false, 0, 0, {
        id: req.user.officeId,
      });
    } else {
      const count = await dataService.getCount(
        Number(req.query.page),
        Number(req.query.limit),
        { ...req.query, doptorId: req.user.doptorId },
        req.query.isPagination,
        "master.office_info"
      );

      const pagination = new Paginate(count, Number(req.query.limit), Number(req.query.page));

      result = await dataService.getOfficeInfo(
        req.query.isPagination && req.query.isPagination == "false" ? false : true,
        pagination.limit,
        pagination.skip,
        _.omit(req.query, "isPagination", "page", "limit")
      );
    }

    return res.status(200).json({
      message: "Request Successful",
      data: result ? toCamelKeys(result) : result,
    });
  })
);
router.get(
  "/officeEmployee",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const count = await dataService.getCount(
      Number(req.query.page),
      Number(req.query.limit),
      req.query,
      req.query.isPagination,
      "master.office_employee"
    );
    const pagination = new Paginate(count, Number(req.query.limit), Number(req.query.page));
    const result = await dataService.getOfficeInfo(
      req.query.isPagination && req.query.isPagination == "false" ? false : true,
      pagination.limit,
      pagination.skip,
      req.query
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result ? toCamelKeys(result) : result,
    });
  })
);

router.get(
  "/employeeRecord",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    let employeeData;
    if (req.query.officeId)
      employeeData = await dataService.getEmployeeRecordByOffice(
        Number(req.query.officeId),
        Number(req.user.employeeId)
      );
    else
      employeeData = await dataService.getEmployeeRecordByOffice(
        Number(req.user.officeId),
        Number(req.user.employeeId)
      );

    return res.status(200).json({
      message: "Request Successful",
      data: employeeData ? toCamelKeys(employeeData) : employeeData,
    });
  })
);
router.get(
  "/employeeRecord/inventory",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    let employeeData;
    if (req.query.officeId) {
      employeeData = await dataService.getEmployeeRecordByOfficeForInventory(
        Number(req.query.officeId),
        Number(req.user.employeeId)
      );
    } else {
      employeeData = await dataService.getEmployeeRecordByOfficeForInventory(undefined, undefined);
    }

    return res.status(200).json({
      message: "Request Successful",
      data: employeeData ? toCamelKeys(employeeData) : employeeData,
    });
  })
);
/**
 * Get meeting type
 * Author: Adnan
 * Updater:
 */
router.get(
  "/meetingType",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const result = await dataService.getMeetingType(Number(req.user.doptorId), Number(req.query.projectId));

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/facilitator/:officeId",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const result = await dataService.getFacilitatorByOffice(
      Number(req.params.officeId),
      Number(req.user.employeeId),
      Boolean(req.query.allEmployeeStatus)
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get Bank, Branch, Account list
 * Author: Adnan
 * Updater:
 */
router.get(
  "/bankInfo",
  [auth(["*"])],
  validates(getBankInfo),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    let result;
    result = await dataService.getBankInfo(
      String(req.query.type),
      Number(req.user.doptorId),
      Number(req.user.officeId),
      req.query.projectId ? Number(req.query.projectId) : null,
      req.query.bankId ? Number(req.query.bankId) : null
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/service-wise-documents",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    const result = await dataService.getServiceWiseDocs(
      Number(req.user.doptorId),
      Number(req.query.projectId),
      Number(req.query.serviceId)
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get all document types
 * Author:
 * Updater:
 * authId:
 */
router.get(
  "/officeLayer",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataService: DataService = Container.get(DataService);
    let result;
    if (req.query.doptorId) {
      result = await dataService.getOfficeLayer(Number(req.query.doptorId));
    } else {
      result = await dataService.getOfficeLayer(Number(req.user.doptorId), Number(req.user.layerId));
    }
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
