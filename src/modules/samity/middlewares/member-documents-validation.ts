import DataService from "../../master/services/master-data.service";
import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import { Pool } from "pg";

const memberDocumentValidation = async (
  memberInfo: any,
  doptorId: number,
  operation: string | undefined,
  pool: Pool
) => {
  const masterDataService: DataService = Container.get(DataService);
  const getAllDocumentSql = `SELECT document_data -> 'own' own_docs FROM loan.document_info`;
  const getSavedMemberDocsSql = `SELECT document_data -> 'own' own_docs FROM loan.document_info WHERE ref_no = $1`;
  let memberIds;
  let getAllDocuments = (await pool.query(getAllDocumentSql)).rows;
  getAllDocuments = getAllDocuments.map((value: any) => value.own_docs);

  let finalAllDocs = [] as any;
  finalAllDocs = finalAllDocs.concat(...getAllDocuments);

  //members payload docs
  let memberDocs;
  let projectId;
  if (Array.isArray(memberInfo)) {
    memberDocs = memberInfo.map((value: any) => value.data.memberDocuments)[0];
    projectId = memberInfo[0].data.projectId;

    if (operation && (operation == "edit" || operation == "update")) {
      memberIds = memberInfo.map((value: any) => {
        if (value.memberType == "update") return value.data.memberId;
        else return 0;
      });
    }
  } else {
    memberDocs = memberInfo.data.memberDocuments;
    projectId = memberInfo.data.projectId;
  }

  //all docs from db
  let documents = (await masterDataService.getServiceWiseDocs(doptorId, projectId, 14)) as any;
  if (!documents.memberDocs) throw new BadRequestError(`সদস্য ভর্তির প্রয়োজনীয় ডকুমেন্টের তথ্য পাওয়া যায়নি`);

  //all mandatory docs
  let mandatoryDocs = documents.memberDocs.filter((value: any) => value.isMandatory == true);
  //members payload doc types
  const mandatoryDocTypes = mandatoryDocs.map((value: any) => value.docType);
  let err = null;
  const allowedFileTypes = ["jpeg", "jpg", "png", "pdf"];
  for (let [index, singleMemberDoc] of memberDocs.entries()) {
    let existingDocCheck;
    let getSavedMemberDocs: any;
    if (operation && operation == "update") {
      if (memberIds && memberIds[index]) {
        getSavedMemberDocs = (await pool.query(getSavedMemberDocsSql, [memberIds[index]])).rows[0]?.own_docs;
      }
      existingDocCheck = finalAllDocs.filter(
        (elem: any) =>
          elem.document_number != getSavedMemberDocs[0].document_number &&
          elem.document_type == getSavedMemberDocs[0].document_type
      );
      let allDocsNo = existingDocCheck.map((value: any) => value.document_number);
      if (existingDocCheck.length > 0 && allDocsNo.includes(singleMemberDoc.documentNumber)) {
        let singleUniqueDocType = documents.memberDocs.filter(
          (value: any) => value.docType == singleMemberDoc.documentType
        );
        err = `সদস্যের প্রদত্ত ${singleUniqueDocType[0]?.docTypeDesc} (${singleMemberDoc.documentNumber}) দিয়ে পূর্বে রেজিস্ট্রেশন করা হয়েছে`;
        throw new BadRequestError(err);
      }
    } else {
      existingDocCheck = finalAllDocs.filter(
        (value: any) =>
          value.document_type == singleMemberDoc.documentType && value.document_number == singleMemberDoc.documentNumber
      );
      if (existingDocCheck.length > 0) {
        let singleUniqueDocType = documents.memberDocs.filter(
          (value: any) => value.docType == singleMemberDoc.documentType
        );
        err = `সদস্যের প্রদত্ত ${singleUniqueDocType[0]?.docTypeDesc} (${singleMemberDoc.documentNumber}) দিয়ে পূর্বে রেজিস্ট্রেশন করা হয়েছে`;
        throw new BadRequestError(err);
      }
    }
    //document mandatory checking
    let singleMemberDocTypes = memberDocs.map((value: any) => value.documentType);
    //duplicate docs checking
    let duplicateDocTypes = singleMemberDocTypes.filter(
      (item: any, index: number) => singleMemberDocTypes.indexOf(item) != index
    );
    let uniqueDuplicateDocTypes = [...new Set(duplicateDocTypes)];
    let singleUniqueDocType = documents.memberDocs.filter((value: any) => value.docType == uniqueDuplicateDocTypes[0]);
    if (uniqueDuplicateDocTypes[0] && singleUniqueDocType[0]) {
      err = `${singleUniqueDocType[0].docTypeDesc} দুইবার প্রদান করা যাবে না`;
      throw new BadRequestError(err);
    }
    let mandatoryDocCheck = mandatoryDocTypes.every((v: any) => singleMemberDocTypes.includes(v));
    //document no mandatory checking
    if (!mandatoryDocCheck) {
      let missinGDocType = mandatoryDocTypes.filter((value: any) => !singleMemberDocTypes.includes(value));
      let missinGDocTypeName = documents.memberDocs.filter((value: any) => value.docType == missinGDocType[0]);
      err = `সদস্যের ${missinGDocTypeName[0].docTypeDesc} দেওয়া আবশ্যক`;
      throw new BadRequestError(err);
    }
    let mainDoc = documents.memberDocs.filter((value: any) => value.docType == singleMemberDoc.documentType);
    if (mainDoc[0] && mainDoc[0].isDocNoMandatory) {
      if (!singleMemberDoc.documentNumber) {
        err = `সদস্যের ${mainDoc[0].docTypeDesc} এর নম্বর দেওয়া আবশ্যক`;
        throw new BadRequestError(err);
      }
      //document no length checking
      if (!mainDoc[0].docNoLength.includes(String(singleMemberDoc.documentNumber).length)) {
        err = `সদস্যের ${mainDoc[0].docTypeDesc} নম্বর অবশ্যই ${mainDoc[0].docNoLength} ডিজিটের হতে হবে`;
        throw new BadRequestError(err);
      }
    }
    //get current document type from all uploaded files list
    let currentDocumentType = documents.memberDocs.filter(
      (value: any) => value.docType == singleMemberDoc.documentType
    );
    //file upload mandatory check
    if (!mandatoryDocCheck && !(singleMemberDoc.documentFront || singleMemberDoc.documentBack)) {
      err = `সদস্যের ${currentDocumentType[0].docTypeDesc} এর ছবি/ফাইল সংযুক্ত করা আবশ্যক`;
      throw new BadRequestError(err);
    }
    //front file type check
    let uploadedSingleFileFrontType =
      singleMemberDoc?.documentFrontType && String(singleMemberDoc.documentFrontType).split("/")[1];
    if (
      mandatoryDocCheck &&
      singleMemberDoc.documentFront &&
      !allowedFileTypes.includes(uploadedSingleFileFrontType) &&
      Buffer.from(singleMemberDoc.documentFront, "base64").toString("base64") === singleMemberDoc.documentFront
    ) {
      err = `সদস্যের ${currentDocumentType[0].docTypeDesc} এর সম্মুখ ছবি/ফাইল JPEG/JPG/PNG/PDF ফরম্যাটে দিতে হবে`;
      throw new BadRequestError(err);
    }
    //back file type check
    let uploadedSingleFileBackType =
      singleMemberDoc?.documentBackType && String(singleMemberDoc.documentBackType).split("/")[1];
    if (
      mandatoryDocCheck &&
      singleMemberDoc.documentBack &&
      !allowedFileTypes.includes(uploadedSingleFileBackType) &&
      Buffer.from(singleMemberDoc.documentBack, "base64").toString("base64") === singleMemberDoc.documentBack
    ) {
      err = `সদস্যের ${currentDocumentType[0].docTypeDesc} এর পিছনের ছবি/ফাইল JPEG/JPG/PNG/PDF ফরম্যাটে দিতে হবে`;
      throw new BadRequestError(err);
    }
  }
};

export default memberDocumentValidation;
