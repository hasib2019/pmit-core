import express, { NextFunction, Request, Response, Router } from "express";
import { default as lo, default as _ } from "lodash";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { uploadFile } from "../../../middlewares/multer.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { minioPresignedGet, uploadObject as upload } from "../../../utils/minio.util";
import { auth } from "../../user/middlewares/auth.middle";
import { ISamityAttrs } from "../interfaces/samity.interface";
import { ISamityTempAttrs } from "../interfaces/samity.temp.interface";
import SamityService from "../services/samity.service";
import {
  approveDol,
  createDol,
  getMemberBySamity,
  getMembersWithFilter,
  getSamityTempInfo,
  getSingleMember,
  getSingleSamity,
  memberAttendance,
  rejectDol,
  updateDol,
} from "../validators/samity.validator";
const router: Router = express.Router();

//Get member info for survey
router.get(
  "/member",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getMember(req.user.officeId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get main member info
router.get(
  "/mainMember",
  [auth(["*"])],
  validates(getMembersWithFilter),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const filter = lo.omit(req.query, ["page", "limit"]);
    const result = await samityService.getMainMember(req.query.page as any, req.query.limit as any, {
      ...(filter as any),
      samityId: req.query.samityId,
    });
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get samity temp info for approval
router.get(
  "/",
  [auth(["*"])],
  validates(getSamityTempInfo, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    let result;
    if (req.query.id) {
      result = await samityService.getSamityAndMemberTempInfoByUser(0, 0, Number(req.query.id), null, null);
    } else if (req.query.officeId && req.query.type)
      result = await samityService.getSamityAndMemberTempInfoByUser(
        0,
        Number(req.query.officeId),
        0,
        String(req.query.type),
        null
      );
    else if (
      !req.query.officeId &&
      req.query.type &&
      (req.user.doptorId == 4 || req.user.doptorId == 8 || req.user.doptorId == 9)
    ) {
      result = await samityService.getSamityAndMemberTempInfoByUser(
        req.user.doptorId,
        Number(req.query.officeId),
        0,
        String(req.query.type),
        null
      );
    } else {
      const count = await samityService.getCount(
        Number(req.query.page),
        Number(req.query.limit),
        { ...req.query, doptorId: req.user.doptorId },
        req.query.isPagination,
        "samity.samity_info"
      );

      const pagination = new Paginate(count, Number(req.query.limit), Number(req.query.page));

      result = await samityService.getSamityInfo(
        req.query.isPagination && req.query.isPagination == "false" ? false : true,
        pagination.limit,
        pagination.skip,
        _.omit(req.query, "isPagination", "page", "limit")
      );
    }

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get samity name
router.get(
  "/samityname",
  auth(["*"]),
  // validates(getSamityNamefromTempandMain),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    let result;
    const samityType = req.query.samityType ? String(req.query.samityType) : null;
    if (req.query.coop) {
      result = await samityService.getSamityNameByUser(
        req.user.officeId,
        req.user.doptorId,
        Number(req.query.value),
        req.query.project ? Number(req.query.project) : null,
        Number(req.query.coop),
        samityType
      );
    } else {
      result = await samityService.getSamityNameByUser(
        req.user.officeId,
        req.user.doptorId,
        Number(req.query.value),
        req.query.project ? Number(req.query.project) : null,
        null,
        samityType
      );
    }

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get single samity details
router.get(
  "/samityDetails",
  auth(["*"]),
  validates(getSingleSamity),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSingleSamity(Number(req.query.value), Number(req.query.id));
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get single dol details
router.get(
  "/dolDetails",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = (await samityService.getSingleDol(
      Number(req.query.value),
      Number(req.query.id),
      Number(req.query.flag)
    )) as any;

    return res.status(200).json({
      message: "Request Successful",
      dolName: result[0]?.dolName,
      isActive: result[0]?.isActive,
      data: result,
    });
  })
);

//Get dol info
router.get(
  "/dol",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    let result;
    if (req.user.doptorId == 4 || req.user.doptorId == 8) {
      result = await samityService.getDol(req.user.officeId, req.query.samity, req.query.value);
    } else {
      result = await samityService.getDol(req.query.officeId, req.query.samity, req.query.value);
    }

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Create dol temp info
router.post(
  "/dol",
  auth(["*"]),
  [validates(createDol)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);

    const result: ISamityTempAttrs | undefined = await samityService.createDol({
      ...req.body,
      resourceName: "dolInfo",
      createdBy: req.user.userId,
      userId: req.user.userId,
      data: {
        ...req.body.data,
      },
      doptorId: req.user.doptorId,
      officeId: req.user.officeId,
    });

    res.status(201).json({
      message: "অনুমোদনের জন্য প্রেরণ করা হয়েছে",
      data: {
        id: result?.id ?? null,
      },
    });
  })
);

//Create dol in final submission
router.post(
  "/finalDol",
  [auth(["*"]), validates(approveDol)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result: string | undefined = await samityService.approveDol({
      allId: req.body.dolId,
      userId: req.user.userId,
      doptorId: req.user.doptorId,
      officeId: req.user.officeId,
      token: req.user,
    });

    res.status(201).json({
      message: result ? result : "সফলভাবে অনুমোদন করা হয়েছে",
      data: result ? result : null,
    });
  })
);

//Reject dol
router.post(
  "/rejectDol",
  [auth(["*"]), validates(rejectDol)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.rejectDol({
      allId: req.body.rejectId,
      userId: req.user.userId,
      //id: req.query.id,
    });

    res.status(201).json({
      message: result ? result : "সফলভাবে বাতিল করা হয়েছে",
      data: {
        data: result ? result : null,
      },
    });
  })
);

//Update main dol info
router.put(
  "/dolInfo/:id",
  auth(["*"]),
  [validates(updateDol)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result: ISamityAttrs = await samityService.updateDol(parseInt(req.params.id), {
      ...req.body,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
    });
    return res.status(200).json({
      message: "সফলভাবে হালনাগাদ করা হয়েছে",
      data: {
        id: result.id ?? null,
      },
    });
  })
);

//Get member list
router.get(
  "/memberBySamity",
  auth(["*"]),
  validates(getMemberBySamity),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getMemberList(
      Number(req.query.samityId),
      Number(req.query.flag),
      false,
      Number(req.query.defaultMembers)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get single member
router.get(
  "/memberDetails",
  auth(["*"]),
  validates(getSingleMember),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSingleMember(Number(req.query.memberId));

    return res.status(200).json({
      message: "Request Successful",
      data: await minioPresignedGet(result, [
        "documentData.own.[].documentFront",
        "documentData.own.[].documentBack",
        "documentData.memberPicture",
        "documentData.memberSign",
        "nomineeInfo.[].nomineePicture",
        "nomineeInfo.[].nomineeSign",
      ]),
    });
  })
);

//Get single member
router.get(
  "/member-details-for-update",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSingleMainMemberForUpdate(Number(req.query.memberId));

    return res.status(200).json({
      message: "Request Successful",
      data: await minioPresignedGet(result, [
        "data.memberDocuments.[].documentFront",
        "data.memberDocuments.[].documentBack",
        "memberPicture",
        "memberSign",
        "nominee.[].nomineePicture",
        "nominee.[].nomineeSign",
      ]),
    });
  })
);

//Member attendance in meeting day
router.post(
  "/memberAttendance",
  auth(["*"]),
  [uploadFile.array("attachment")],
  validates(memberAttendance),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    let attachment: string[] = [];
    if (req.files) {
      const files = req.files as any;

      for (const v of files) {
        const fileName = `${new Date().getTime()}-${v.originalname}`;
        const mRes = await upload({
          fileName: fileName,
          buffer: v.buffer,
        });
        if (mRes) attachment.push(fileName);
      }
    }

    const result: any = await samityService.memberAttendance({
      doptorId: req.user.doptorId,
      officeId: req.user.officeId,
      ...lo.omit(req.body, ["attachment", "meetingDate"]),
      meetingDate: new Date(req.body.meetingDate),
      imageName: attachment,
      createdBy: req.user.userId,
      createdAt: new Date(),
    });
    res.status(201).send({
      message: "সফলভাবে উপস্থিতি নেওয়া হয়েছে",
      data: result,
    });
  })
);

//Get all customers who applied for loan
router.get(
  "/loanMembers",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getLoanAppliedMembers(
      Number(req.query.samityId),
      String(req.query.type),
      req.user.doptorId
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//Get customer approved loan info
router.get(
  "/customerLoanInfo",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getCustomerLoanInfo(Number(req.query.customerId));

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/customerAccountInfo",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getCustomerAccountInfo(
      req.query.doptorId ? Number(req.query.doptorId) : Number(req.user.doptorId),
      req.query.officeId ? Number(req.query.officeId) : 0,
      Number(req.query.projectId),
      req.query.productId ? Number(req.query.productId) : 0,
      Number(req.query.samityId),
      Number(req.query.customerId),
      req.query?.allAccounts ? String(req.query.allAccounts) : undefined
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

//get product nature wise customer account
router.get(
  "/productWiseAccount",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getProductWiseAccount(
      req.query.doptorId ? Number(req.query.doptorId) : Number(req.user.doptorId),
      req.query.officeId ? Number(req.query.officeId) : Number(req.user.officeId),
      Number(req.query.samityId),
      Number(req.query.customerId),
      req.query.productNature ? String(req.query.productNature) : undefined
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/customer/due-loan-amount-info",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);

    const loanDueAmountInfo = await samityService.getCustomerDueLoanAmount(Number(req.query.accountId));

    return res.status(200).json({
      message: "Request Successful",
      data: loanDueAmountInfo,
    });
  })
);

router.get(
  "/customer/finalcial-info",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);

    const customerFinancialInfo = await samityService.getCustomerFinancialInfo(Number(req.query.originSamityId));

    return res.status(200).json({
      message: "Request Successful",
      data: customerFinancialInfo,
    });
  })
);

export default router;
