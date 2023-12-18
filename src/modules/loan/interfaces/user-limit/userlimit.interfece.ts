export interface userLimitInput {
  transactionLimit: transactionLimitInput[];
  loanApproveLimit: loanApproveLimitInput[];
  userId?: number;
  roleId?: number;
  doptorId?: number;
  saveStatus?: 1 | 2;
  createdBy: string;
  createDate: Date;
  updatedBy: string;
  updateDate: Date;
}

export interface transactionLimitInput {
  id?: number;
  limitTypeId: number;
  limitAmount: number;
  projectId: number;
}

export interface loanApproveLimitInput {
  id?: number;
  productId: number;
  amount: number;
  limitTypeId: number;
}
