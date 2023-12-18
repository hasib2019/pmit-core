import express, { Router, Request, Response, NextFunction } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { validates } from "../../../middlewares/express-validation.middle";
//import { upload } from "../../../middlewares/multer.middle";
import path from "path";
import fsAsync from "fs/promises";
//import minio from "../../storage/services/minio.service";
import {
  complexValidation,
  step1Validation,
  step2Validation,
  step3Validation,
} from "../validators/test.validator";

const router: Router = express.Router();

// router.post('/',
//     [upload.fields([{ name: 'image', maxCount: 1 }])],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {
//
//         const files: any = req.files
//         const rPath = path.resolve(files["image"][0].path);
//         const mRes = await minio.upload({
//             fileName: files["image"][0].filename,
//             path: rPath,
//             contentType: files["image"][0].mimetype
//         });
//         //
//         await fsAsync.unlink(rPath);
//         return res.status(200).json({
//             message: "Success"
//         })
//     })
// )

// router.get('/',
//     [],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {

//         const stat = await minio.getMetadata({
//             fileName: req.query.name
//         })
//         //
//         const readStream = await minio.download({
//             fileName: req.query.name
//         });

//         res.setHeader('content-type', stat.metaData['content-type']);
//         res.setHeader("Content-Disposition", `attachment; filename=${req.query.name}`)
//         readStream.pipe(res);
//

//         readStream.on('end', () => {
//
//             readStream.unpipe(res);
//             return res.status(200).send();
//         })
//     })
// )

// /**
//  * Complex Validation
//  */
// router.post('/validation',
//     [validates(complexValidation)],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {
//
//         return res.status(200).json({
//             message: "Success"
//         })

//     })
// )

// // shape = [{resourceName:, userId:, data:{}, lastStep:,}]
// const tempTable: any[] = [];
// const myTable: any[] = [];

// router.post('/samity/step1',
//     [validates(step1Validation)],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {

//         tempTable.push({
//             resourceName: 'samity',
//             userId: 10,
//             lastStep: 1,
//             data: {
//                 step1: { ...req.body }
//             }
//         });

//         return res.status(200).json({
//             message: "Success"
//         })

//     })
// )

// router.post('/samity/step2',
//     [validates(step2Validation)],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {
//         const samity = tempTable.find(s => s.resourceName === 'samity');
//         samity.lastStep = 2;
//         samity.data = {
//             ...samity.data,
//             step2: { ...req.body }
//         }
//         return res.status(200).json({
//             message: "Success"
//         })

//     })
// )

// router.post('/samity/confirm',
//     [],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {
//         const index = tempTable.findIndex(s => s.resourceName === 'samity');
//         myTable.push(tempTable[index]);
//         tempTable.splice(index, 1);
//
//
//         return res.status(200).json({
//             message: "Success"
//         })

//     })
// )

// router.get('/samity/temp',
//     [validates(step1Validation)],
//     wrap(async (req: Request, res: Response, next: NextFunction) => {

//         const samity = tempTable.find(s => s.resourceName === 'samity');

//         return res.status(200).json({
//             message: "Success",
//             data: samity
//         })

//     })
// )

export default router;
