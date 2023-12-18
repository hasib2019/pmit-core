import { query } from "express-validator";

// export const getCodeMasterData = [
//   query("codeType", "সঠিক কোড উল্লেখ করুন")
//     .isIn([
//       "HOM",
//       "LAN",
//       "TRP",
//       "BNK",
//       "ACT",
//       "OCD",
//       "NTY",
//       "SIN",
//       "OTY",
//       "STY",
//       "MST",
//       "EDT",
//       "SUB",
//       "RLN",
//       "CSS",
//       "RGN",
//       "ACS",
//       "REL",
//       "RSN",
//       "CST",
//       "NAT",
//       "OCC",
//       "OPI",
//       "COU",
//       "DID",
//       "SOC",
//       "TRN",
//       "DOC",
//       "ADR",
//       "LMT",
//       "SLG",
//       "GEN",
//       "MET",
//       "GTP",
//       "SIT",
//       "RQT",
//       "URR",
//       "TDT",
//       "VST",
//       "VFT",
//       "VCT",
//       "VFQ",
//       "VPM",
//     ])
//     .trim(),
// ];

export const getFieldsData = [
  query("pageName", "পেইজের সঠিক নাম উল্লেখ করুন").isLength({ min: 1, max: 500 }).trim(),
  query("project", "প্রকল্প ভুল ফরম্যাটে আছে").isInt().trim(),
];

export const getBankInfo = [
  query("type", "Invalid input of type").notEmpty().trim().isIn(["bank", "branch", "account"]),
  query("bankId", "ব্যাংকার আইডি ভুল ফরম্যাটে আছে").optional().trim().isInt(),
  query("branchId", "ব্রাঞ্চের আইডি ভুল ফরম্যাটে আছে").optional().trim().isInt(),
  query("projectId", "প্রকল্প ভুল ফরম্যাটে আছে").optional().trim().isInt(),
];

// all code master short form meaning
// "HOM": "HOME DESCRIPTION"
// "LAN": "LAND DESCRIPTION"
// "TRP": "TRANSACTION PROFILE CODE"
// "BNK": "BANK MASTER"
// "ACT": "A/C TYPE"
// "OCD": "OPERATION CODES"
// "NTY": "NOMINATION TYPE"
// "SIN": "STANDING INSTRUCTIONS"
// "OTY": "OPERATION TYPE"
// "STY": "STATIONARY"
// "MST": "MARITAL STATUS"
// "EDT": "EDUCATION TYPE"
// "SUB": "SUBJECTS"
// "RLN": "RELATIONSHIPS"
// "CSS": "CUSTOMER STATUS"
// "RGN": "REGION CODES"
// "ACS": "A/C STATUS"
// "REL": "RELIGION"
// "RSN": "REASONS"
// "CST": "CUSTOMER TYPE"
// "NAT": "NATIONALITY CODES"
// "OCC": "OCCUPATION TYPE"
// "OPI": "OPERATING INSTRUCTIONS"
// "COU": "COUNTRY CODE"
// "DID": "DOCUMENT ID"
// "SOC": "SUB OCCUPATION TYPE"
// "TRN": "TRANSACTION TYPE"
// "DOC": "DOCUMENT TYPE"
// "ADR": "ADDRESS TYPE"
// "LMT": "LOAN LIMIT"
// "SLG": "SUB LEDGER"
// "GEN": "GENDER"
//"MET": "MEETING DAY"
