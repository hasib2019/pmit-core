import { IProjectZoneAttrs } from "./projectZone.interface";

export interface IProjectAttrs {
  id?: number;
  projectName?: string;
  projectNameBangla?: string;
  projectCode?: string;
  projectDirector?: string;
  doptorId?: number;
  officeId?: number;
  initiateDate?: Date;
  projectDuration?: number;
  estimatedExp?: number;
  description?: string;
  fundSource?: string;
  expireDate?: Date;
  projectPhase?: string;
  admissionFee?: number;
  admissionGlId?: number | null;
  passbookFee?: number;
  passbookGlId?: number | null;
  isDefaultSavingsProduct?: boolean;
  isDefaultShareProduct?: boolean;
  zone?: IProjectZoneAttrs[];
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
  samityType?: string[];
}
