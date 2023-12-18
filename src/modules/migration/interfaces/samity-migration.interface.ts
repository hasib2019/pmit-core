/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-11-15 10:05:39
 * @modify date 2022-11-15 10:05:39
 * @desc [description]
 */

export interface SamityMigrationInput {
  samityOldCode: string;
  samityName: string;
  samityMemberType: "M" | "F" | "B";
  doptorId: number;
  officeId: number;
  projectId: number;
  districtId: number;
  address: string;
  foUserId: number;
  meetingDay: string;
  samityType: string;
  weekPosition: number;
  meetingType: "M" | "W";
  formationDate: Date;
}

export interface SamityMigrationAttrs {
  upaCityId: number;
  upaCityType: string;
  uniThanaPawId: number;
  uniThanaPawType: string;
  memberMinAge: number;
  memberMaxAge: number;
  samityMinMember: number;
  samityMaxMember: number;
  groupMinMember: number;
  groupMaxMember: number;
  coopStatus: boolean;
  isSme: boolean;
  flag: number;
}

export interface SamityMigrationMemberInput {
  customerOldCode: string;
  nameEn: string;
  nameBn: string;
  birthDate: Date;
  fatherName: string;
  motherName: string;
  registrationDate: Date;
  mobileNumber: string;
  nid: string;
  brn: string;
  religion: number;
  gender: number;
  currentDepositBalance: number;
  currentShareBalance: number;
}
