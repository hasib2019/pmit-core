/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-11-20 14:11:41
 * @modify date 2022-11-20 14:11:41
 * @desc [description]
 */

import { body, Meta, ValidationChain } from "express-validator";
import { get } from "lodash";
import moment from "moment";
import { Container } from "typedi";
import { SamityMigrationService } from "../services/samity-migration.service";

const samityDuplicateCheck: ValidationChain = body("samityCodes.*.samityOldCode")
  .isString()
  .withMessage("samityOldCode should be string")
  .custom(async (value, { req }) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.samityDuplicateCheck(value, req.body.officeId, req.body.projectId);

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট সমিতি কোডঃ ${value} পাওয়া গেছে।`) : true;
  });

const samityUpdateDuplicateCheck: ValidationChain = body("samityOldCode")
  .isString()
  .withMessage("samityOldCode should be string")
  .custom(async (value: string, { req }: Meta) => {
    // const index = path.split(".")[1];
    //   const brn: any = get(req.body, `data.${index}.brn`);
    const samityId = req.params?.id;
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.samityDuplicateCheck(
      value,
      req.body.officeId,
      req.body.projectId,
      samityId
    );

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট সমিতি কোডঃ ${value} পাওয়া গেছে।`) : true;
  });

const memberCodeDuplicateCheck: ValidationChain = body("*.customerOldCode")
  .isString()
  .withMessage("customerOldCode should be string")
  .custom(async (value: string, { req }: Meta) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.memberDuplicateCheck(req.params?.id, value);

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট সদস্যের কোডঃ ${value} পাওয়া গেছে।`) : true;
  });

const memberNIDCheck: ValidationChain = body("*.nid")
  .custom((value: string, { req, path, location }: Meta) => {
    const length = String(value).length;

    const brn = getValueByPath(req.body, path, "nid", "brn");

    if (brn) return true;

    if (length == 10 || length == 17) return true;

    return false;
  })
  .withMessage("জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
  .bail()
  .custom(async (value: string, { req }: Meta) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.memberDuplicateCheck(req.params?.id, value);

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট মেম্বার জাতীয় পরিচয়পত্র নম্বরঃ ${value} পাওয়া গেছে।`) : true;
  });

const memberBRNCheck: ValidationChain = body("*.brn")
  .custom((value: string) => {
    const length = String(value).length;

    if (length == 17) return true;

    return false;
  })
  .withMessage("জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের হতে হবে")
  .bail()
  .custom(async (value: string, { req }: Meta) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.memberDuplicateCheck(req.params?.id, value);

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট মেম্বার জন্ম নিবন্ধন নম্বরঃ ${value} পাওয়া গেছে।`) : true;
  })
  .optional({ checkFalsy: true });

const memberBirthDateCheck: ValidationChain = body("*.birthDate")
  .isDate({
    format: "DD/MM/YYYY",
    delimiters: ["/", "-"],
  })
  .custom((value) => moment().diff(moment(value, "DD/MM/YYYY"), "years") >= 18)
  .withMessage((value: string, { req, path }: Meta) => {
    const customerCodePath = path.replace("birthDate", "customerOldCode");
    const members = req.body;
    return `মেম্বার কোডঃ ${get(members, customerCodePath)} বয়স ১৮ বছরের বেশি হতে হবে`;
  });

const memberCodeUpdateDuplicateCheck: ValidationChain = body("*.customerOldCode")
  .isString()
  .withMessage("customerOldCode should be string")
  .custom(async (value: string, { req, path }: Meta) => {
    const members = req.body;

    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.memberDuplicateCheck(req.params?.id, value, get(members, path));

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট মেম্বার কোডঃ ${value} পাওয়া গেছে।`) : true;
  });

const memberUpdateNIDCheck: ValidationChain = body("*.nid")
  .custom((value: string) => {
    const length = String(value).length;

    if (length == 10 || length == 17) return true;

    return false;
  })
  .withMessage("জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
  .bail()
  .custom(async (value: string, { req, path }: Meta) => {
    const members = req.body;
    const customerCodePath = path.replace("nid", "customerOldCode");
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.memberDuplicateCheck(
      req.params?.id,
      value,
      get(members, customerCodePath)
    );

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট মেম্বার জাতীয় পরিচয়পত্র নম্বরঃ ${value} পাওয়া গেছে।`) : true;
  });

const memberUpdateBRNCheck: ValidationChain = body("*.brn")
  .custom((value: string) => {
    const length = String(value).length;

    if (length == 17) return true;

    return false;
  })
  .withMessage("জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের হতে হবে")
  .bail()
  .custom(async (value: string, { req, path }: Meta) => {
    const members = req.body;
    const customerCodePath = path.replace("brn", "customerOldCode");
    const samityMigrationService = Container.get(SamityMigrationService);
    const isDuplicate = await samityMigrationService.memberDuplicateCheck(
      req.params?.id,
      value,
      get(members, customerCodePath)
    );

    return isDuplicate ? Promise.reject(`ডুপ্লিকেট মেম্বার জন্ম নিবন্ধন নম্বরঃ ${value} পাওয়া গেছে।`) : true;
  })
  .optional({ checkFalsy: true });

export const samityMigrationValidator = [
  samityDuplicateCheck,
  body().isArray({ min: 1 }).withMessage(`ন্যূনতম একটি সমিতির তথ্য দেওয়া আবশ্যক`),
  body("*.samityName")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "samityName")} সমিতির নাম পাওয়া যায়নি`
    ),
  body("*.samityMemberType")
    .isIn([2, 3, 4])
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "samityMemberType")} মেম্বারের ধরন পাওয়া যায়নি`
    ),
  body("*.officeId")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "officeId")} অফিস পাওয়া যায়নি`
    ),
  body("*.projectId")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "projectId")} প্রোজেক্ট পাওয়া যায়নি`
    ),
  body("*.union")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) => `সমিতি কোডঃ ${getSamityOldCode(body, path, "union")} ইউনিয়ন পাওয়া যায়নি`
    ),
  body("*.address")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "address")} ঠিকানা পাওয়া যায়নি`
    ),
  body("*.foUserId")
    .isInt({ min: 1 })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `সমিতি কোডঃ ${getSamityOldCode(body, path, "foUserId")} ফিল্ড অফিসার পাওয়া যায়নি`;
    }),
  body("*.meetingDay")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "meetingDay")} মিটিং এর দিন পাওয়া যায়নি`
    ),
  body("*.meetingType")
    .isIn(["M", "W"])
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "meetingType")} মিটিং এর ধরন পাওয়া যায়নি`
    ),
  body("*.weekPosition")
    .custom((value, { req: { body }, path }: Meta) => {
      const meetingType = getValueByPath(body, path, "weekPosition", "meetingType");

      if (meetingType == "M") return value == 1 || value == 2 || value == 3 || value == 4;
      if (meetingType == "W") return value == null || value == "";
    })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "weekPosition")} সপ্তাহ পাওয়া যায়নি`
    ),
  body("*.formationDate")
    .isDate({
      format: "DD/MM/YYYY",
      delimiters: ["/", "-"],
    })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "formationDate")} সমিতি গঠনের দিন পাওয়া যায়নি`
    ),
];

export const samityMigrationUpdateValidator = [
  samityUpdateDuplicateCheck,
  body("samityName")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "samityName")} সমিতির নাম পাওয়া যায়নি`
    ),
  body("samityMemberType")
    .isIn(["2", "3", "4"])
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "samityMemberType")} মেম্বারের ধরন পাওয়া যায়নি`
    ),
  body("officeId")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "officeId")} অফিস পাওয়া যায়নি`
    ),
  body("projectId")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "projectId")} প্রোজেক্ট পাওয়া যায়নি`
    ),
  body("union")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) => `সমিতি কোডঃ ${getSamityOldCode(body, path, "union")} ইউনিয়ন পাওয়া যায়নি`
    ),
  body("address")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "address")} ঠিকানা পাওয়া যায়নি`
    ),
  body("foUserId")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "foUserId")} ফিল্ড অফিসার পাওয়া যায়নি`
    ),
  body("meetingDay")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "meetingDay")} মিটিং এর দিন পাওয়া যায়নি`
    ),
  body("meetingType")
    .isIn(["M", "W"])
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "meetingType")} মিটিং এর ধরন পাওয়া যায়নি`
    ),
  body("weekPosition")
    .custom((value, { req: { body }, path }: Meta) => {
      const meetingType = getValueByPath(body, path, "weekPosition", "meetingType");

      if (meetingType == "M") return value == 1 || value == 2 || value == 3 || value == 4;
      if (meetingType == "W") return value == null || value == "";
    })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "weekPosition")} সপ্তাহ পাওয়া যায়নি`
    ),
  body("formationDate")
    .isDate({
      format: "DD/MM/YYYY",
      delimiters: ["/", "-"],
    })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `সমিতি কোডঃ ${getSamityOldCode(body, path, "formationDate")} সমিতি গঠনের দিন পাওয়া যায়নি`
    ),
];

export const loanInfoMigrationValidator = [
  body("loanInfos.*.customerOldCode")
    .custom(async (code, { req: { body } }) => {
      const { samityId } = body;
      const samityMigrationService = Container.get(SamityMigrationService);
      const checkCustomerExistanceResult = await samityMigrationService.checkIsMemberExist(code, samityId);
      return checkCustomerExistanceResult ? true : Promise.reject(`এই সদস্য ${code} বিদ্যমান নেই`);
    })
    .custom(async (code, { req: { body }, path }) => {
      const samityMigrationService = Container.get(SamityMigrationService);
      return (await samityMigrationService.checkIsMemberHaveLoanAlready(code, body.samityId))
        ? true
        : Promise.reject(`এই সদস্যের (${code}) ইতিমধ্যে লোণের তথ্য রয়েছে `);
    }),
  body("loanInfos.*.productId").custom(async (productId, { req: { body }, path }) => {
    if (productId) {
      return true;
    } else {
      return Promise.reject(`এই সদস্যের ${getCustomerOldCode(body, path, "productId")} ঋণের প্রোডাক্ট নির্বাচন করুন`);
    }
  }),
  body("loanInfos.*.purposeId").custom(async (purposeId, { req: { body }, path }) => {
    if (purposeId) {
      return true;
    } else {
      return Promise.reject(`এই সদস্যের ${getCustomerOldCode(body, path, "purposeId")}ঋণের উদ্দেশ্য নির্বাচন করুন`);
    }
  }),
];

export const memberMigrationValidator = [
  memberCodeDuplicateCheck,
  memberNIDCheck,
  memberBRNCheck,
  memberBirthDateCheck,
  body().isArray({ min: 1 }).withMessage(`ন্যূনতম একটি সদস্যের তথ্য দেওয়া আবশ্যক`),
  body("*.nameEn")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "nameEn")} ইংরেজি নাম পাওয়া যায়নি`
    ),
  body("*.nameBn")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "nameBn")} বাংলা নাম পাওয়া যায়নি`
    ),
  body("*.fatherName")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "fatherName")} পিতার নাম পাওয়া যায়নি`
    ),
  body("*.motherName")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "motherName")} মাতার নাম পাওয়া যায়নি`
    ),
  body("*.maritalStatus")
    .isInt()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "religion")} বৈবাহিক অবস্থা পাওয়া যায়নি`
    ),

  body("*.spouseName")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "religion")} স্বামী বা স্ত্রীর নাম স্ট্রিং হতে হবে`
    )
    .optional(),
  body("*.registrationDate")
    .isDate({
      format: "DD/MM/YYYY",
      delimiters: ["/", "-"],
    })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "registrationDate")} নিবন্ধনের দিন পাওয়া যায়নি`
    ),
  body("*.mobile")
    .isMobilePhone("bn-BD")
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "mobile")} সঠিক মোবাইল নম্বর দিন`
    ),
  body("*.religion")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "religion")} ধর্ম পাওয়া যায়নি`
    ),
  body("*.gender")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "gender")} লিঙ্গ পাওয়া যায়নি`
    ),
  body("*.presentAddress")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "presentAddress")} বর্তমান ঠিকানা পাওয়া যায়নি`
    ),
  body("*.permanentAddress")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "permanentAddress")} স্থায়ী ঠিকানা পাওয়া যায়নি`
    ),
  body("*.occupation").custom(async (value, { req: { body, params }, path }) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const samityId = params?.id;
    const projectId = await samityMigrationService.getProjectIdFromMigrationStaginArea(samityId);

    if (projectId == 13) {
      return true;
    }

    if (typeof value == "number") {
      return true;
    }

    return Promise.reject(`মেম্বার কোডঃ ${getCustomerOldCode(body, path, "occupation")} পেশা পাওয়া যায়নি`);
  }),
  body("*.education").custom(async (value, { req: { body, params }, path }) => {
    const samityMigrationService = Container.get(SamityMigrationService);
    const samityId = params?.id;
    const projectId = await samityMigrationService.getProjectIdFromMigrationStaginArea(samityId);

    if (projectId == 13) {
      return true;
    }

    if (typeof value == "number") {
      return true;
    }

    return Promise.reject(`মেম্বার কোডঃ ${getCustomerOldCode(body, path, "education")} শিক্ষাগত যোগ্যতা পাওয়া যায়নি`);
  }),
  body("*.depositProduct")
    .custom((value, { req: { body }, path }) => {
      const currentDepositBalance = getCustomerCurrentDepositBalance(body, path, "depositProduct");

      if (currentDepositBalance && value === null) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "depositProduct")} ডিপোসিট প্রোডাক্ট পাওয়া যায়নি`;
    }),
  body("*.shareProduct")
    .custom((value, { req: { body }, path }) => {
      const currentShareBalance = getCustomerCurrentShareBalance(body, path, "shareProduct");

      if (currentShareBalance && value === null) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "shareProduct")} শেয়ার প্রোডাক্ট পাওয়া যায়নি`;
    }),
  body("*.currentDepositBalance")
    .custom((value, { req: { body }, path }) => {
      const depositProduct = getCustomerDepositProduct(body, path, "currentDepositBalance");

      if (!value && depositProduct) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(
        body,
        path,
        "currentDepositBalance"
      )} ডিপসিট ব্যালেন্স প্রদান করুন করুন`;
    })
    .custom((value) => {
      return value < 0 ? false : true;
    })
    .withMessage("বর্তমান আমানত ব্যালেন্স ঋণাত্মক হতে পারবেনা"),
  body("*.currentShareBalance")
    .custom((value, { req: { body }, path }) => {
      const shareProduct = getCustomerShareProduct(body, path, "currentShareBalance");

      if (shareProduct && !value) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "currentShareBalance")} শেয়ার ব্যালেন্স প্রদান করুন`;
    })
    .custom((value) => {
      return value < 0 ? false : true;
    })
    .withMessage(`বর্তমান শেয়ার ব্যালেন্স ঋণাত্মক হতে পারবেনা`),
];

export const memberMigrationUpdateValidator = [
  memberCodeUpdateDuplicateCheck,
  memberUpdateNIDCheck,
  memberUpdateBRNCheck,
  memberBirthDateCheck,
  body("*.nameEn")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "nameEn")} ইংরেজি নাম পাওয়া যায়নি`
    ),
  body("*.nameBn")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "nameBn")} বাংলা নাম পাওয়া যায়নি`
    ),
  body("*.fatherName")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "fatherName")} পিতার নাম পাওয়া যায়নি`
    ),
  body("*.motherName")
    .isString()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "motherName")} মাতার নাম পাওয়া যায়নি`
    ),
  body("*.registrationDate")
    .isDate({
      format: "DD/MM/YYYY",
      delimiters: ["/", "-"],
    })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "registrationDate")} নিবন্ধনের দিন পাওয়া যায়নি`
    ),
  body("*.mobile")
    .isMobilePhone("bn-BD")
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "mobile")} সঠিক মোবাইল নম্বর দিন`
    ),
  body("*.religion")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "religion")} ধর্ম পাওয়া যায়নি`
    ),
  body("*.gender")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "gender")} লিঙ্গ পাওয়া যায়নি`
    ),
  body("*.presentAddress")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "presentAddress")} বর্তমান ঠিকানা পাওয়া যায়নি`
    ),
  body("*.permanentAddress")
    .notEmpty()
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "permanentAddress")} স্থায়ী ঠিকানা পাওয়া যায়নি`
    ),
  body("*.occupation")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "occupation")} পেশা পাওয়া যায়নি`
    ),
  body("*.education")
    .isInt({ min: 1 })
    .withMessage(
      (value, { req: { body }, path }: Meta) =>
        `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "education")} শিক্ষাগত যোগ্যতা পাওয়া যায়নি`
    ),
  body("*.depositProduct")
    .custom((value, { req: { body }, path }) => {
      const currentDepositBalance = getCustomerCurrentDepositBalance(body, path, "depositProduct");

      if (currentDepositBalance && value === null) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "depositProduct")} ডিপোসিট প্রোডাক্ট পাওয়া যায়নি`;
    }),
  body("*.shareProduct")
    .custom((value, { req: { body }, path }) => {
      const currentShareBalance = getCustomerCurrentShareBalance(body, path, "shareProduct");

      if (currentShareBalance && value === null) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "shareProduct")} শেয়ার প্রোডাক্ট পাওয়া যায়নি`;
    }),
  body("*.currentDepositBalance")
    .custom((value, { req: { body }, path }) => {
      const depositProduct = getCustomerDepositProduct(body, path, "currentDepositBalance");

      if (!value && depositProduct) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(
        body,
        path,
        "currentDepositBalance"
      )} ডিপসিট ব্যালেন্স প্রদান করুন করুন`;
    })
    .custom((value) => {
      return value < 0 ? false : true;
    })
    .withMessage("বর্তমান আমানত ব্যালেন্স ঋণাত্মক হতে পারবেনা"),
  body("*.currentShareBalance")
    .custom((value, { req: { body }, path }) => {
      const shareProduct = getCustomerShareProduct(body, path, "currentShareBalance");

      if (shareProduct && !value) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      return `মেম্বার কোডঃ ${getCustomerOldCode(body, path, "currentShareBalance")} শেয়ার ব্যালেন্স প্রদান করুন`;
    })
    .custom((value) => {
      return value < 0 ? false : true;
    })
    .withMessage(`বর্তমান শেয়ার ব্যালেন্স ঋণাত্মক হতে পারবেনা`),
];
export const isMemberExistInTheSamityCheck: ValidationChain[] = [
  body("memberCodes.*.customerOldCode")
    .isString()
    .withMessage("customerOldCode must be string")
    .custom(async (code, { req: { body } }) => {
      console.log("membercode", code);
      const { samityId } = body;
      const samityMigrationService = Container.get(SamityMigrationService);
      const checkCustomerExistanceResult = await samityMigrationService.checkIsMemberExist(code, +samityId);
      return checkCustomerExistanceResult ? true : Promise.reject(`এই সদস্য ${code} বিদ্যমান নেই`);
    }),
  body("samityId").exists().withMessage("সমিতি আইডি প্রদান করুন").isInt().withMessage("সঠিক সমিতি আইডি প্রদান করুন"),
];
export const dpsFdrMigrationValidator = [
  body("dpsFdrInfos.*.customerOldCode").custom(async (code, { req: { body } }) => {
    const { samityId } = body;
    const samityMigrationService = Container.get(SamityMigrationService);
    const checkCustomerExistanceResult = await samityMigrationService.checkIsMemberExist(code, samityId);
    return checkCustomerExistanceResult ? true : Promise.reject(`এই সদস্য ${code} বিদ্যমান নেই`);
  }),
];

export const samityCodeValidator = [samityDuplicateCheck];
export const memberExistValidator = isMemberExistInTheSamityCheck;
export const memberValidator = [memberCodeDuplicateCheck, memberNIDCheck, memberBRNCheck];

const getSamityOldCode = (data: Array<Object>, path: string, value: string): string =>
  getValueByPath(data, path, value, "samityOldCode");

const getCustomerOldCode = (data: Array<Object>, path: string, value: string): string =>
  getValueByPath(data, path, value, "customerOldCode");
const getCustomerDepositProduct = (data: Array<Object>, path: string, value: string) =>
  getValueByPath(data, path, value, "depositProduct");
const getCustomerShareProduct = (data: Array<Object>, path: string, value: string) =>
  getValueByPath(data, path, value, "shareProduct");
const getCustomerCurrentDepositBalance = (data: Array<Object>, path: string, value: string) =>
  getValueByPath(data, path, value, "currentDepositBalance");
const getCustomerCurrentShareBalance = (data: Array<Object>, path: string, value: string) =>
  getValueByPath(data, path, value, "currentShareBalance");

const getValueByPath = (data: Array<Object>, path: string, replaceValue: string, replaceWith: string): any => {
  return get(data, path.replace(replaceValue, replaceWith));
};
