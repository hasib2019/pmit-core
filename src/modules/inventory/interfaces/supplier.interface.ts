export interface SupplierAttr {
  id?: number;
  doptroId: number;
  officeId: number;
  supplierName: String;
  contactPersonName: String;
  mobile: String;
  email: String;
  address: String;
  supplierDetails: String;
  isActive: Boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: String;
  updatedBy?: String;
  updateHistory?: any;
}
