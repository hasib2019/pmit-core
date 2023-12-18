import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { validates } from "../../../middlewares/express-validation.middle";
import { createProject, getProjectWithFilter, getUser, updateProject } from "../validators/project.validator";
import lo from "lodash";
import Container from "typedi";
import ProjectService from "../services/project.service";
import { IProjectAttrs } from "../interfaces/project.interface";
import BadRequestError from "../../../errors/bad-request.error";
import { auth } from "../../user/middlewares/auth.middle";
import { getCode } from "../../../configs/auth.config";

const router: Router = express.Router();

/**
 * create new project
 * Author: Rukaiya
 * Updater:
 * authId: 3.1.1
 */
router.post(
  "/",
  auth(["*"]),
  [validates(createProject)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const projectService: ProjectService = Container.get(ProjectService);
    const result: IProjectAttrs | undefined = await projectService.create({
      ...req.body,
      doptorId: req.user.doptorId,
      createdBy: req.user.userId,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: {
        id: result?.id ?? null,
      },
    });
  })
);

/**
 * Update project info by id
 * Author: Adnan
 * Updater:
 * authId: 3.1.2
 */
router.put(
  "/:id",
  auth(["*"]),
  validates(updateProject),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const projectService: ProjectService = Container.get(ProjectService);
    if (lo.size(req.body) > 0) {
      const result: IProjectAttrs = await projectService.update(
        {
          id: parseInt(req.params.id),
          doptorId: Number(req.user.doptorId),
        } as any,
        { ...req.body, updatedBy: req.user.userId, updatedAt: new Date() }
      );
      return res.status(200).json({
        message: "সফলভাবে হালনাগাদ করা হয়েছে",
        data: {
          id: result.id ?? null,
        },
      });
    }
    next(new BadRequestError("No update field provided"));
  })
);

/**
 * Get project info with filter
 * Author: Adnan
 * Updater:
 * authId: 3.1.3
 */
router.get(
  "/projectWithPagination",
  [auth(["*"]), validates(getProjectWithFilter)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const projectService: ProjectService = Container.get(ProjectService);
    const filter = lo.omit(req.query, ["page", "limit"]) as any;
    const result = await projectService.get(
      req.query.page as any,
      req.query.limit as any,
      req.query.doptorId ? req.query.doptorId : req.user.doptorId,
      filter
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const projectService: ProjectService = Container.get(ProjectService);
    const result = await projectService.getProjectWithoutPagination(req.user.projects);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/projectByOffice",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const projectService: ProjectService = Container.get(ProjectService);
    var result;
    if (req.query.userId) {
      result = await projectService.getProjectByOffice(parseInt(req.user.doptorId), Number(req.query.userId));
    } else {
      result = await projectService.getProjectByOffice(parseInt(req.user.doptorId), null);
    }
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get user list by doptor
 * Author: Rukaiya
 * Updater: Adnan
 * authId: 3.1.3
 */
router.get(
  "/userByDoptor",
  [auth(["*"]), validates(getUser)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const projectService: ProjectService = Container.get(ProjectService);
    var result;
    if (req.query.officeId) result = await projectService.getUserByDoptor(0, Number(req.query.officeId));
    else if (req.query.doptorId) result = await projectService.getUserByDoptor(parseInt(req.user.doptorId), 0);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
