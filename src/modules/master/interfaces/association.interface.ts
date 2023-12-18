/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-22 11:57:21
 * @modify date 2022-08-22 11:57:21
 * @desc [description]
 */

export type AssociationMemberAddressTypeAttrs = "PRE" | "PER";

export interface AssociationMembersAddressAttrs {
  id?: number;
  addressType?: AssociationMemberAddressTypeAttrs;
  geoDivisionId?: number;
  geoDistrictId?: number;
  geoUpazilaId?: number;
  detailAddress?: number;
}

export interface AssociationMembersAttrs {
  localId: number;
  nameEn?: string;
  nameBn?: string;
  code?: string;
  mobile?: string;
  genderId?: number;
  occupationId?: number;
  religionId?: number;
  email?: string;
  user?: {
    id?: number;
    roleId?: number;
  };
  addresses?: AssociationMembersAddressAttrs[];
  nid?: string;
  brn?: string;
  tin?: string;
  passport?: string;
  fatherNameEn?: string;
  fatherNameBn?: string;
  motherNameEn?: string;
  motherNameBn?: string;
  spouseNameEn?: string;
  spouseNameBn?: string;
  dob?: Date;
}

export interface AssociationAttrs {
  localId: number;
  nameEn?: string;
  nameBn?: string;
  originDoptorId?: number;
  officeId?: number;
  moduleId?: number;
  code?: string;
  status?: string;
  geoDivisionId?: number;
  geoDistrictId?: number;
  geoUpazilaId?: number;
  detailAddress?: number;
  numberOfShare?: number;
  perSharePrice?: number;
  members?: AssociationMembersAttrs[];
}
