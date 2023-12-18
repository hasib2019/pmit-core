/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-11-14 15:00:15
 * @modify date 2022-11-14 15:00:15
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import lodash from "lodash";
import { BadRequestError, NotFoundError, Paginate } from "rdcd-common";
import { Container } from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { pageCheck } from "../../../middlewares/page-check.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { SamityMigrationInput } from "../interfaces/samity-migration.interface";
import { wrap } from "./../../../middlewares/wraps.middle";
import { SamityMigrationMemberInput } from "./../interfaces/samity-migration.interface";
import { SamityMigrationService } from "./../services/samity-migration.service";
import {
  isMemberExistInTheSamityCheck,
  memberExistValidator,
  memberMigrationUpdateValidator,
  memberMigrationValidator,
  memberValidator,
  samityCodeValidator,
  samityMigrationUpdateValidator,
  samityMigrationValidator,
} from "./../validators/samity-migration.validate";

const router: Router = Router();

router.get(
  "/approve-samity",
  [auth(["*"])],
  pageCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;
    const { dpsFdrMigration = false } = allQuery;
    const { projectId = null } = allQuery;

    const withoutLoanApproved = allQuery.withoutLoanApproved || false;

    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;

    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit", "withoutLoanApproved", "dpsFdrMigration"]);

    const count: number = await samityMigrationService.count(allQuery);
    const pagination = new Paginate(count, limit, page);
    const data = await samityMigrationService.getApprovedMigratedSamity(
      Number(req.user.doptorId),
      Number(req.user.officeId),
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      withoutLoanApproved,
      dpsFdrMigration,
      Number(req?.user?.districtId),
      Number(req?.user?.upazilaId),
      Number(projectId)
    );

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

router.post(
  "/samity",
  [auth(["*"]), validates(samityMigrationValidator, true)],
  wrap(async (req: Request<unknown, unknown, SamityMigrationInput[]>, res: Response, next: NextFunction) => {
    const samityInfo = req.body;

    //insert data from req user
    const doptorId = req.user.doptorId;
    const formattedSamity = samityInfo.map((s) => {
      return {
        ...s,
        doptorId,
      };
    });

    const samityMigrationService = Container.get(SamityMigrationService);
    const data = await samityMigrationService.store(formattedSamity, req.user.userId);

    res.status(201).send({
      message: "request successful",
      data,
    });
  })
);

router.post(
  "/samity/approve/:id",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.id as unknown as number;
    const { approveStatus } = req.body;

    const samityMigrationService = Container.get(SamityMigrationService);

    const data = await samityMigrationService.samityApprove(samityId, approveStatus, req.user.userId);

    res.status(201).send({
      message: "request successful",
      data,
    });
  })
);

router.post(
  "/samity/:id/members",
  [auth(["*"]), validates(memberMigrationValidator, true)],
  wrap(
    async (req: Request<{ id: number }, unknown, SamityMigrationMemberInput[]>, res: Response, next: NextFunction) => {
      const samityId = req.params.id as unknown as number;
      const members = req.body;

      const samityMigrationService = Container.get(SamityMigrationService);
      const data = await samityMigrationService.storeMembers(samityId, members);

      res.status(201).send({
        message: "request successful",
        data,
      });
    }
  )
);
// router.post(
//   "/samity/:id/loan-info",
//   [auth(["*"]), validates(loanInfoMigrationValidator, true)],
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const samityId = req.params.id;
//       const officeId = req.user.officeId;
//       const doptorId = req.user.doptorId;
//       const loanInfos = req.body;
//       const samityMigrationService = Container.get(SamityMigrationService);
//       const data = await samityMigrationService.storeLoanInfo(
//         loanInfos,
//         officeId,
//         parseInt(samityId),
//         Number(doptorId)
//       );
//     } catch (error: any) {
//       console.log("loanInfoMigrationError", error);
//     }

//     // res.status(201).send({
//     //   message: "request successful",
//     //   data,
//     // });
//   })
// );

router.put(
  "/samity/:id",
  [auth(["*"]), validates(samityMigrationUpdateValidator, true)],
  wrap(async (req: Request<{ id: number }, unknown, SamityMigrationInput>, res: Response, next: NextFunction) => {
    const samityId = req.params.id as unknown as number;
    const updatedData = req.body;

    const samityMigrationService = Container.get(SamityMigrationService);
    const data = await samityMigrationService.updateById(samityId, updatedData, req.user.userId);

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

router.put(
  "/samity/:id/members",
  [auth(["*"]), validates(memberMigrationUpdateValidator, true)],
  wrap(
    async (req: Request<{ id: number }, unknown, SamityMigrationMemberInput[]>, res: Response, next: NextFunction) => {
      const samityId = req.params.id as unknown as number;
      const updatedData = req.body;

      const samityMigrationService = Container.get(SamityMigrationService);
      const data = await samityMigrationService.updateMemberBySamityId(samityId, updatedData, req.user.userId);

      res.status(200).send({
        message: "request successful",
        data,
      });
    }
  )
);

router.get(
  "/samity",
  [auth(["*"])],
  wrap(
    async (req: Request<unknown, unknown, unknown, { approveStatus?: string }>, res: Response, next: NextFunction) => {
      const samityMigrationService = Container.get(SamityMigrationService);

      const { approveStatus } = req.query;
      let data;

      const officeId = req.user.officeId;

      if (approveStatus != undefined) {
        data = await samityMigrationService.getByOffice(officeId, approveStatus);
      } else {
        data = await samityMigrationService.getByOffice(officeId);
      }

      res.status(200).send({
        message: "request successful",
        data,
      });
    }
  )
);

router.post(
  "/samity/duplicate-check",
  [auth(["*"]), validates(samityCodeValidator, true)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({
      message: "request successful",
      data: true,
    });
  })
);
router.post(
  "/dpsFdr/member-exist-check",
  [auth(["*"]), validates(memberExistValidator)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({
      message: "request successful",
      data: true,
    });
  })
);

router.post(
  "/samity/:id/member-duplicate-check",
  [auth(["*"]), validates(memberValidator, true)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send({
      message: "request successful",
      data: true,
    });
  })
);
router.get(
  "/loan-info-from-application/:samityId/:projectId",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const samityId = Number(req.params.samityId);
      const samityMigrationService = Container.get(SamityMigrationService);
      const projectId = Number(req.params.projectId);
      const data = await samityMigrationService.getLoanInfoFromApplicationTable(samityId, projectId);

      res.status(200).send({
        message: "Request Successful",
        data,
      });
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  })
);
router.get(
  "/loan-info-from-application-of-a-customer/:applicationId/:customerOldCode",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const samityMigrationService = Container.get(SamityMigrationService);
      const applicationId = Number(req.params.applicationId);
      const customerOldCode = Number(req.params.customerOldCode);
      const data = await samityMigrationService.getLoanInfoFromApplicationOfACustomer(applicationId, customerOldCode);
      res.status(200).send({
        message: "Request Successfull",
        data,
      });
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  })
);

router.get(
  "/samity/:id",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.id as unknown as number;
    const samityMigrationService = Container.get(SamityMigrationService);
    let data;
    try {
      data = await samityMigrationService.getById(samityId);
    } catch (error: any) {}

    if (!data) {
      throw new NotFoundError();
    }

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

//delete samity
router.delete(
  "/samity/:id",
  [auth(["*"])],
  wrap(async (req: Request<{ id: number }, unknown, unknown>, res: Response, next: NextFunction) => {
    const samityId = req.params.id as unknown as number;

    const samityMigrationService = Container.get(SamityMigrationService);
    const data = await samityMigrationService.deleteSamity(samityId);

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

//delete member
router.delete(
  "/samity/:id/members",
  [auth(["*"])],
  wrap(async (req: Request<{ id: number }, unknown, unknown>, res: Response, next: NextFunction) => {
    const samityId = req.params.id as unknown as number;
    const customerOldCodes = req.body as Array<string>;

    const samityMigrationService = Container.get(SamityMigrationService);
    const data = await samityMigrationService.deleteMembers(samityId, customerOldCodes);

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

export { router as samityMigrationRouter };
