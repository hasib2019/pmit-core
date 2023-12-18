import { body, Meta } from "express-validator";
import Container from "typedi";
import { SamityMigrationService } from "../services/samity-migration.service";
import { get } from "lodash";
export const dpsFdrMigrationValidatorForPost = [
  body("dpsFdrInfos.*.index").optional(),
  body("dpsFdrInfos.*.customerOldCode")
    .notEmpty()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "customerOldCode")}  এর  মেম্বার কোড দেওয়া আবশ্যক`;
    })
    .custom(async (code, { req: { body } }) => {
      const { samityId } = body;
      const samityMigrationService = Container.get(SamityMigrationService);
      const isMemberExist: boolean = await samityMigrationService.checkIsMemberExist(code, +samityId);
      return isMemberExist ? true : Promise.reject(`এই সদস্য ${code} বিদ্যমান নেই`);
    }),
  body("dpsFdrInfos.*.openingDate")
    .notEmpty()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "openingDate")}  এর  খোলার তারিখ  দেওয়া আবশ্যক`;
    })
    .isDate({
      format: "DD/MM/YYYY",
      delimiters: ["/", "-"],
    })
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return ` ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "openingDate")} এর খোলার তারিখ পাওয়া যায়নি`;
    }),
  body("dpsFdrInfos.*.savingsTerm")
    .notEmpty()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "savingsTerm")}  এর সঞ্চয় মেয়াদ (মাস) দেওয়া আবশ্যক`;
    })
    .isInt()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "savingsTerm")}  এর সঞ্চয় মেয়াদ (মাস) পাওয়া যায়নি`;
    }),
  body("dpsFdrInfos.*.depositInstallment")
    .isInt()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      const rowId = getRowIndex(dpsFdrInfos, path, "depositInstallment");
      const obj = dpsFdrInfos?.find((dpsFdr: any) => dpsFdr?.index?.toString() === rowId?.toString());
      const { productName } = obj;
      if (productName?.depositNature === "F" && value) {
        return `ক্রমিক নম্বর-${rowId} এর এফ ডি আর প্রোডাক্ট এ জমা কিস্তির পরিমাণ দেওয়া যাবেনা`;
      } else if (productName?.depositNature === "C" && !value) {
        return `ক্রমিক নম্বর-${rowId} এর ডি পি এস  প্রোডাক্ট এ জমা কিস্তির পরিমাণ দেওয়া আবশ্যক`;
      } else {
        return true;
      }
    }),
  body("dpsFdrInfos.*.totalDepositAmount")
    .notEmpty()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "totalDepositAmount")}  এর মোট জমার পরিমাণ দেওয়া আবশ্যক`;
    })
    .isInt()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "totalDepositAmount")}  এর মোট জমার পরিমাণ পাওয়া যায়নি`;
    }),
  body("dpsFdrInfos.*.paidPenal")
    .notEmpty()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "paidPenal")}  এর পরিশেধিত পেনাল চার্জ দেওয়া আবশ্যক`;
    })
    .isInt()
    .withMessage((value, { req: { body }, path }: Meta) => {
      const { dpsFdrInfos } = body;
      return `ক্রমিক নম্বর- ${getRowIndex(dpsFdrInfos, path, "paidPenal")}  এর পরিশেধিত পেনাল চার্জ পাওয়া যায়নি
      `;
    }),
];
const getRowIndex = (data: Array<Object>, path: string, value: string): string =>
  getValueByPath(data, path, value, "index");
const getValueByPath = (data: Array<Object>, path: string, replaceValue: string, replaceWith: string): any => {
  return get(data, path.replace(replaceValue, replaceWith));
};
