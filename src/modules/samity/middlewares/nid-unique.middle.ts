import { Request, Response, NextFunction } from "express";
import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import SamityService from "../services/samity.service";

const unique = async (req: Request, res: Response, next: NextFunction) => {
  const samityService: SamityService = Container.get(SamityService);
  let uniqueStatus = await samityService.memberNidUniqueCheck(
    req.body.memberInfo
  );
  let err = null;
  if (!uniqueStatus)
    err = "প্রদত্ত ডকুমেন্ট নম্বর দিয়ে পূর্বে নিবন্ধন সম্পন্ন হয়েছে";

  if (err) next(new BadRequestError(err));
  else next();
};

export default unique;
