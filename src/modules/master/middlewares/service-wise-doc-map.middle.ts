import { Request, Response, NextFunction } from "express";
import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";

const memberDocCheck = async (memberDocs: any, nomineeDocs: any) => {
  let memberError: string = "";
  let nomineeError: string = "";

  //member document validation
  if (memberDocs && Array.isArray(memberDocs)) {
    for (let value of memberDocs) {
      if (
        value.numMandatory &&
        (!value.docNoLength.length || value.docNoLength.length <= 0)
      ) {
        memberError = `সদস্যের প্রয়োজনীয় ডকুমেন্টের নম্বরের সংখ্যা(কমপক্ষে ১টি) সঠিকভাবে উল্লেখ করুন`;
        break;
      }
    }
  }

  //nominee document validation
  if (nomineeDocs && Array.isArray(nomineeDocs)) {
    for (let value of nomineeDocs) {
      if (
        value.numMandatory &&
        (!value.docNoLength.length || value.docNoLength.length <= 0)
      ) {
        nomineeError = `নমিনির প্রয়োজনীয় ডকুমেন্টের নম্বরের সংখ্যা(কমপক্ষে ১টি) সঠিকভাবে উল্লেখ করুন`;
        break;
      }
    }
  }

  if (memberError) return memberError;
  else if (nomineeError) return nomineeError;
  else return "";
};

const serviceWiseDocMapMiddle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const memberDocs = req.body.serviceRules.memberDocs;
  const nomineeDocs = req.body.serviceRules.nomineeDocs;
  let docError = await memberDocCheck(memberDocs, nomineeDocs);

  if (docError) next(new BadRequestError(docError));
  else next();
};

export default serviceWiseDocMapMiddle;
