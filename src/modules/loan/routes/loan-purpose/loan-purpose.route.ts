import { NextFunction, Request, Response, Router } from "express";
import { validates } from "../../../../middlewares/express-validation.middle";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../user/middlewares/auth.middle";
import { LoanPurposeServices } from "../../services/loan-purpose/loan-purpose.service";
import { createLoanPurposeCategory, createLoanPurpose } from "../../validators/loan-purpose.validator";


const router= Router();

router.post(
    "/create-category",
    [auth(["*"])],
    validates(createLoanPurposeCategory),
    wrap(async (req: Request, res: Response, next: NextFunction) => {
    const loanPurposeServices: LoanPurposeServices = Container.get(LoanPurposeServices)
  
     const response = await loanPurposeServices.createLoanPurposeCategory({...req.body,createdBy: req.user.userId});
  
      res.status(201).send({
        message: response?.message,
        data: response?.result
      });
    })
  );
  

  router.get(
    "/get-category",
    [auth(["*"])],
    
    wrap(async (req: Request, res: Response, next: NextFunction) => {
    const loanPurposeServices: LoanPurposeServices = Container.get(LoanPurposeServices)
      
     const result = await loanPurposeServices.getLoanPurposeCategory()
  
      res.status(200).send({
        message: "সফলভাবে তৈরি হয়েছে",
        data: result,
      });
    })
  );

  router.get(
    "/get-loan-purpose",
    [auth(["*"])],
    
    wrap(async (req: Request, res: Response, next: NextFunction) => {
    const loanPurposeServices: LoanPurposeServices = Container.get(LoanPurposeServices)
      
     const result = await loanPurposeServices.getLoanPurpose()
  
      res.status(200).send({
        message: "request successful",
        data: result,
      });
    })
  );
  
  router.get(
    "/get-loan-purpose-mapping",
    // [auth(["*"])],
    
    wrap(async (req: Request, res: Response, next: NextFunction) => {
    const loanPurposeServices: LoanPurposeServices = Container.get(LoanPurposeServices)
      
     const result = await loanPurposeServices.getLoanPurposeMappingList(Number(req.query.projectId))
  
      res.status(200).send({
        message: "request successful",
        data: result,
      });
    })
  );


  router.post(
    "/create-loan-purpose",
    [auth(["*"])],
    validates(createLoanPurpose),
    wrap(async (req: Request, res: Response, next: NextFunction) => {
    const loanPurposeServices: LoanPurposeServices = Container.get(LoanPurposeServices)
  
     const response = await loanPurposeServices.createLoanPurpose({...req.body,createdBy: req.user.userId});
  
      res.status(201).send({
        message: response?.message,
        data: response?.result
      });
    })
  );

  export { router as loanPurposeRouter};