export interface AllotmentInfoAttr {
  readonly id?: number;
  readonly itemId: number;
  readonly quantity: number;
  readonly originDesignationId: number;
  createdBy?: String;
  updatedBy?: String;
  createdAt?: Date;
  updatedAt?: Date;
  updateHistory?: any;
}
