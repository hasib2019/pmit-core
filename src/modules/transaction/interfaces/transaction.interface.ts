export interface ITransactionAttrs {
  // glacName?: string;
  id?: number;
  doptorId?: number;
  officeId?: number;
  projectId?: number | null;
  productDetails?: object[];
  productId?: number;
  accountId?: number;
  tranType?: string;
  tranCode?: string;
  // docDate?: Date;
  // valDate?: Date;
  glCode?: string;
  glacId?: number | null;
  subglId?: number;
  drcrCode?: string | null;
  tranAmt?: number;
  tranNum?: string;
  batchNum?: string;
  tranDate?: Date;
  channelCode?: string;
  revTranId?: number;
  chequeNum?: string;
  chequeDate?: Date;
  bankId?: number;
  branchId?: number;
  transferAcNo?: string;
  authorizeStatus?: string;
  authorizedBy?: string;
  authorizedAt?: Date;
  naration?: string;
  createdBy?: number;
  createdAt?: Date;
  updateBy?: string;
  updateDate?: Date;
  actionType?: string;
}

export interface IMakeRepaymentSequence {
  finalPaidAmount?: number | undefined;
  updateTranAmt?: number | undefined;
}
