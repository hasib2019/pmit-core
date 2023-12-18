/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-28 10:15:01
 * @modify date 2022-08-28 10:15:01
 * @desc [description]
 */

export interface DayOpenCloseAttrs {
  id?: number;
  openCloseDate?: Date;
  eodBy?: string;
  eodTime?: Date;
  openCloseFlag?: boolean;
  oodBy?: string;
  oodTime?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
  doptorId?: number;
  officeId?: number;
  projectId?: number;
}

export interface IOpenDateAttrs {
  openCloseDate?: Date;
  openCloseFlag?: boolean;
  openCloseId?: number;
  projectId?: number;
  projectName?: string;
  projectNameBangla?: string;
}

