export interface ISamityTempAttrs {
  id?: number;
  resourceName?: string;
  userId?: string;
  data?: object;
  status?: string;
  districtId?: number;
  upazilaId?: number;
  doptorId?: number;
  projectId?: number;
  officeId?: number;
  remarks?: string;
  createdBy?: string;
  createDate?: string;
}

export interface ISamityNeedForCorrectionAttrs {
  remarks?: string;
}
