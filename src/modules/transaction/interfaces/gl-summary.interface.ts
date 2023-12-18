/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-09-01 16:50:47
 * @modify date 2022-09-01 16:50:47
 * @desc [description]
 */

export interface GLSummaryAttrs {
  doptorId: number;
  officeId: number;
  projectId: number;
  tranDate: Date;
  glacId: number;
  debitAmt: number;
  creditAmt: number;
  createdBy?: number;
  createdAt?: Date;
  updatedBy?: number;
  updatedAt?: Date;
}
