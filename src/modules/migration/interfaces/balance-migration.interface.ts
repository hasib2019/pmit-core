/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-01-05 12:03:23
 * @modify date 2023-01-05 12:03:23
 * @desc [description]
 */

export interface BalanceMigrationInputAttrs {
  id: number;
  glCode: string;
  glName: string;
  debitBalance: number;
  creditBalance: number;
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface BalanceMigrationAttrs extends BalanceMigrationInputAttrs {
  officeId: number;
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
}
