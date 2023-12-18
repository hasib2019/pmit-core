export const masterApprovalDataType: any = {
  "office-origin-unit": {
    tableName: "master.office_origin",
    primaryKey: "id",
    fields: ["id", "name_bn", "name_en", "layer_id"],
  },
  office: {
    tableName: "master.office_info",
    primaryKey: "id",
    fields: ["id", "doptor_id", "division", "district", "upazila", "name_bn"],
  },
};
