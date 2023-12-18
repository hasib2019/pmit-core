import { body } from "express-validator";

// if (!state.localState.officeId) {
//     flag = false;
//     obj.officeId = "অফিস নির্বাচন করুন";
//   }
//   if (!state.localState.holidayType) {
//     flag = false;
//     obj.holidayType = "ছুটির ধরণ নির্বাচন করুন";
//   }
//   if (state.localState.saveAndEditButtonLevel === "সংরক্ষণ করুন") {
//     if (!state.localState.fromDate) {
//       flag = false;
//       obj.fromDate = "ছুটি শুরুর তারিখ দিন";
//     }
//     if (!state.localState.toDate) {
//       flag = false;
//       obj.toDate = "ছুটি শেষের তারিখ দিন ";
//     }
//     if (state.localState.fromDate && state.localState.toDate) {

//       const from =Date.parse(state.localState.fromDate);
//       const to = Date.parse(state.localState.toDate);
//       if (to < from) {

//         flag = false;
//         obj.toDate = "ছুটি শেষের তারিখ শুরুর তারিখ থেকে বড় হতে হবে";
//       }
//     }
//   }
//   if (state.localState.saveAndEditButtonLevel === "হালদানাগাদ করুন") {
//     if (!state.localState.holidayDateForEdit) {
//       flag = false;
//       obj.holidayDateForEdit = "ছুটির তারিখ দিন";
//     }
//     if (!state.localState.status) {
//       flag = false;
//       obj.status = "ছুটির স্টেটাস দিন";
//     }
//   }

// holidayType: state.localState.holidayType,
// officeId: parseInt(state.localState.officeId),
// ...(state.localState.saveAndEditButtonLevel === "সংরক্ষণ করুন" && {
//   fromDate: state.localState.fromDate,
//   toDate: state.localState.toDate,
// }),
// ...(state.localState.saveAndEditButtonLevel === "হালদানাগাদ করুন" && {
//   holiday: state.localState.holidayDateForEdit,
// }),
// description: state.localState.holidayDescription,
// ...(state.localState.saveAndEditButtonLevel === "হালদানাগাদ করুন" && {
//   isActive: state.localState.status,
// }),
export const holidaySetupValidator = [
  body("holidayType", "অফিস নির্বাচন করুন").exists().notEmpty(),
  body("officeId", "অফিস নির্বাচন করুন").exists().notEmpty(),
  body("fromDate", "ছুটি শুরুর তারিখ দিন").exists().notEmpty().optional(),
  body("toDate", "ছুটি শেষের তারিখ দিন").exists().notEmpty().optional(),
  body("holiday", "ছুটির  তারিখ দিন").exists().notEmpty().optional(),
  body("description", "ছুটির বিস্তারিত দিন").exists().notEmpty().optional(),
  body("isActive", "ছুটির স্টেটাস দিন").exists().notEmpty().optional(),
];
