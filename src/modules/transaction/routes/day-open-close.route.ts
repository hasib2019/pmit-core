// /**
//  * @author Md Raju Ahmed
//  * @email rajucse1705@gmail.com
//  * @create date 2022-08-28 15:10:47
//  * @modify date 2022-08-28 15:10:47
//  * @desc [description]
//  */

// import { NextFunction, Request, Response, Router } from "express";
// import Container from "typedi";
// import { validates } from "../../../middlewares/express-validation.middle";
// import { wrap } from "../../../middlewares/wraps.middle";
// import { auth } from "../../user/middlewares/auth.middle";
// import { DayOpenCloseService } from "../services/day-open-close.service";
// import { dayOpenCloseValidator } from "../validators/day-open-close.validator";

// const router = Router();

// router.post(
//   "/day-open",
//   [auth(["*"])],
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const dayOpenCloseService = Container.get(DayOpenCloseService);
//     const result = await dayOpenCloseService.getOpenCloseFlagAndInserNewOpenDate(
//       req.body.openDate,
//       Number(req.user?.doptorId),
//       Number(req.body.officeId),
//       req.user?.userId,
//       req.body.projectId && Number(req.body.projectId)
//     );
//     res.status(201).send({
//       message: "সফল হয়েছে",
//       data: result,
//     });
//   })
// );

// router.post(
//   "/",
//   [auth(["*"])],
//   [validates(dayOpenCloseValidator, true)],
//   wrap(async (req: Request<unknown, unknown, any[]>, res: Response, next: NextFunction) => {
//     const dayOpenCloseService = Container.get(DayOpenCloseService);

//     let data: any[] = [];
//     let message = ``;
//     for await (const d of req.body) {
//       const returnvalue = await dayOpenCloseService.dayClose(
//         d.openCloseDate,
//         req.user.userId,
//         req.user.userId,
//         d.projectId,
//         d.officeId ? d.officeId : req.user.officeId,
//         req.user.doptorId,
//         parseInt(req.user.userId)
//       );
//       data.push(returnvalue);
//       console.log("isNext", returnvalue.isNextDayClosed);
//       if (!returnvalue.isNextDayClosed) {
//         message = returnvalue.message;
//       }
//     }
//     console.log("message69", message);
//     res.status(200).send({
//       message: message && message !== "Success" ? message : "সফল হয়েছে",
//       data,
//     });
//   })
// );

// router.get(
//   "/",
//   [auth(["*"])],
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const dayOpenCloseService = Container.get(DayOpenCloseService);
//     const data = await dayOpenCloseService.getCurrentOpenDay(
//       req.user.userId,
//       req.user.doptorId,
//       Number(req.user.officeId)
//     );

//     const openDaysOfAnOffice = await dayOpenCloseService.getCurrentOpenDayOfAOffice(parseInt(req.user.officeId));

//     // const data = {
//     //   ...data,
//     //   openDaysOfAnOffice: openDaysOfAnOffice,
//     // };

//     res.status(200).send({
//       message: "Request successful",
//       data: {
//         projectWiseOpenDates: [...data],
//         officeWiseOpenDates: openDaysOfAnOffice,
//       },
//     });
//   })
// );

// export { router as dayOpenCloseRouter };
/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-28 15:10:47
 * @modify date 2022-08-28 15:10:47
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { DayOpenCloseService } from "../services/day-open-close.service";
import { dayOpenCloseValidator } from "../validators/day-open-close.validator";

const router = Router();
router.post(
  "/day-open",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dayOpenCloseService = Container.get(DayOpenCloseService);
    const result = await dayOpenCloseService.getOpenCloseFlagAndInserNewOpenDate(
      req.body.openDate,
      Number(req.user?.doptorId),
      Number(req.body.officeId),
      req.user?.userId,
      req.body.projectId && Number(req.body.projectId)
    );
    res.status(201).send({
      message: "সফল হয়েছে",
      data: result,
    });
  })
);

router.post(
  "/",
  [auth(["*"])],
  [validates(dayOpenCloseValidator, true)],
  wrap(async (req: Request<unknown, unknown, any[]>, res: Response, next: NextFunction) => {
    const dayOpenCloseService = Container.get(DayOpenCloseService);

    let data: any[] = [];
    let message = ``;
    for await (const d of req.body) {
      const returnvalue = await dayOpenCloseService.dayClose(
        d.openCloseDate,
        req.user.userId,
        req.user.userId,
        d.projectId,
        d.officeId ? d.officeId : req.user.officeId,
        req.user.doptorId,
        parseInt(req.user.userId)
      );
      data.push(returnvalue);
      if (!returnvalue.isNextDayClosed) {
        message = returnvalue.message;
      }
    }
    res.status(200).send({
      message: message && message !== "Success" ? message : "সফল হয়েছে",
      data,
    });
  })
);

router.get(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dayOpenCloseService = Container.get(DayOpenCloseService);
    const data = await dayOpenCloseService.getCurrentOpenDay(
      req.user.userId,
      req.user.doptorId,
      Number(req.user.officeId)
    );

    const openDaysOfAnOffice = await dayOpenCloseService.getCurrentOpenDayOfAOffice(parseInt(req.user.officeId));

    // const data = {
    //   ...data,
    //   openDaysOfAnOffice: openDaysOfAnOffice,
    // };

    res.status(200).send({
      message: "Request successful",
      data: {
        projectWiseOpenDates: [...data],
        officeWiseOpenDates: openDaysOfAnOffice,
      },
    });
  })
);
router.get("/get-open-date-with-or-without-project/:projectId", [auth(["*"])], async (req: Request, res: Response) => {
  const dayOpenCloseService = Container.get(DayOpenCloseService);
  const data = await dayOpenCloseService.getOpenDateWithOrWithotProject(
    Number(req.user.officeId),
    req.params.projectId ? Number(req.params.projectId) : null
  );
  res.status(200).send({
    message: "Successfull",
    data: data,
  });
});

export { router as dayOpenCloseRouter };
