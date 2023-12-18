import DataService from "../../master/services/master-data.service";
import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";

const nomineeDocumentValidation = async (memberInfo: any, doptorId: number) => {
  const masterDataService: DataService = Container.get(DataService);

  //members payload docs
  let nomineeDocs: any;
  let projectId;
  if (Array.isArray(memberInfo)) {
    nomineeDocs = memberInfo.map((value: any) => value.nominee)[0];
    projectId = memberInfo[0].data.projectId;
  } else {
    nomineeDocs = memberInfo.nominee;
    projectId = memberInfo.data.projectId;
  }
  //all docs from db
  let documents = (await masterDataService.getServiceWiseDocs(doptorId, projectId, 14)) as any;
  if (!documents.nomineeDocs)
    throw new BadRequestError(`সদস্য ভর্তির জন্য নমিনির প্রয়োজনীয় ডকুমেন্টের তথ্য পাওয়া যায়নি`);

  //all mandatory docs
  let mandatoryDocs = documents.nomineeDocs.filter((value: any) => value.isMandatory == true);

  //members payload doc types
  const mandatoryDocTypes = mandatoryDocs.map((value: any) => value.docType);
  let err = null;

  //duplicate docs checking
  let duplicateDocTypes = nomineeDocs.filter((item: any, index: number) => nomineeDocs.indexOf(item) != index);

  let uniqueDuplicateDocTypes = [...new Set(duplicateDocTypes)];

  let singleUniqueDocType = documents.nomineeDocs.filter((value: any) => value.docType == uniqueDuplicateDocTypes[0]);
  if (uniqueDuplicateDocTypes[0] && singleUniqueDocType[0]) {
    err = `নমিনির ডকুমেন্টে ${singleUniqueDocType[0].docTypeDesc} দুইবার প্রদান করা যাবে না`;
    throw new BadRequestError(err);
  }

  //mandatory checking
  let nomineeDocTypes = nomineeDocs.map((value: any) => value.docType);
  let mandatoryDocCheck = mandatoryDocTypes.every((v: any) => nomineeDocTypes.includes(v));

  //document no mandatory checking
  if (!mandatoryDocCheck) {
    let missinGDocType = mandatoryDocTypes.filter((value: any) => !nomineeDocTypes.includes(value));
    let missinGDocMsg = documents.nomineeDocs.filter((value: any) => value.docType == missinGDocType[0]);
    err = `নমিনির ${missinGDocMsg[0].docTypeDesc} দেওয়া আবশ্যক`;
    throw new BadRequestError(err);
  }

  for (let singleDoc of nomineeDocs) {
    let mainDoc = documents.nomineeDocs.filter((value: any) => value.docType == singleDoc.docType);
    if (mainDoc[0] && mainDoc[0].isDocNoMandatory) {
      if (!singleDoc.docNumber) {
        err = `নমিনির ${mainDoc[0].docTypeDesc} এর নম্বর দেওয়া আবশ্যক`;
        throw new BadRequestError(err);
      }

      //document no length checking
      if (!mainDoc[0].docNoLength.includes(String(singleDoc.docNumber).length)) {
        err = `নমিনির ${mainDoc[0].docTypeDesc} নম্বর অবশ্যই ${mainDoc[0].docNoLength} ডিজিটের হতে হবে`;
        throw new BadRequestError(err);
      }
    }
  }
};

export default nomineeDocumentValidation;
