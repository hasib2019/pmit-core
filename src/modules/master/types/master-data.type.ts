/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-01-10 15:25:59
 * @modify date 2022-01-10 15:25:59
 * @desc [description]
 */

export const masterDataInfo = {
  "geo-code": {
    division: {
      tableName: "division_info",
      primaryKey: "id",
      fields: ["id", "division_code", "division_name", "division_name_bangla"],
      filters: {},
    },
    district: {
      tableName: "district_info",
      primaryKey: "id",
      fields: ["id", "division_id", "district_code", "district_name", "district_name_bangla"],
      filters: {},
    },
    upazila: {
      tableName: "upazila_info",
      primaryKey: "id",
      fields: ["id", "division_id", "district_id", "upazila_code", "upazila_name", "upazila_name_bangla"],
      filters: {},
    },
    "upa-city": {
      tableName: "mv_upazila_city_info",
      primaryKey: "upa_city_id",
      fields: [
        "division_id",
        "division_code",
        "division_name",
        "division_name_bangla",
        "district_id",
        "district_code",
        "district_name",
        "district_name_bangla",
        "upa_city_type",
        "upa_city_id",
        "upa_city_code",
        "upa_city_name",
        "upa_city_name_bangla",
      ],
      filters: {},
    },
    "uni-thana-paurasabha": {
      tableName: "mv_union_thana_paurasabha_info",
      primaryKey: "uni_thana_paw_id",
      fields: [
        "division_id",
        "division_code",
        "division_name",
        "division_name_bangla",
        "district_id",
        "district_code",
        "district_name",
        "district_name_bangla",
        "uni_thana_paw_type",
        "uni_thana_paw_id",
        "uni_thana_paw_code",
        "uni_thana_paw_name",
        "uni_thana_paw_name_bangla",
        "upa_city_id",
        "upa_city_type",
      ],
      filters: {},
    },
    cityCorp: {
      tableName: "city_corp_info",
      primaryKey: "id",
      fields: [
        "id",
        "division_id",
        "district_id",
        "upazila_id",
        "city_corp_code",
        "city_corp_name",
        "city_corp_name_bangla",
      ],
      filters: {},
    },
    union: {
      tableName: "union_info",
      primaryKey: "id",
      fields: [
        "id",
        "division_id",
        "district_id",
        "upazila_id",
        "city_corp_id",
        "union_code",
        "union_name",
        "union_name_bangla",
      ],
      filters: {},
    },
  },
  "document-type": {
    tableName: "document_type",
    primaryKey: "id",
    fields: ["id", "doc_type", "doc_type_desc", "is_active"],
    filters: {},
  },
  project: {
    tableName: "project_info",
    primaryKey: "id",
    fields: [
      "id",
      "project_name",
      "project_name_bangla",
      "project_code",
      "project_director",
      "doptor_id",
      "office_id",
      "initiate_date",
      "project_duration",
      "estimate_exp",
      "fund_source",
      "expire_date",
      "project_phase",
      "description",
      "is_active",
      "enterprising_id",
    ],
    filters: {},
  },
  occupation: {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "OCC",
    },
  },
  relation: {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "RLN",
    },
  },
  "master-code": {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "***",
    },
  },
  religion: {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "REL",
    },
  },
  "education-level": {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "EDT",
    },
  },
  "enterprising-org": {
    tableName: "enterprising_org",
    primaryKey: "id",
    fields: [
      "id",
      "org_name",
      "org_name_bangla",
      "org_code",
      "org_director",
      "doptor_id",
      "office_id",
      "initiate_date",
      "project_duration",
      "estimated_exp",
      "fund_source",
      "expire_date",
      "project_phase",
      "description",
      "is_active",
    ],
    filters: {},
  },
  "marital-status": {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "MST",
    },
  },
  gender: {
    tableName: "code_master",
    primaryKey: "id",
    fields: ["id", "code_type", "return_value", "display_value", "is_active"],
    filters: {
      code_type: "GEN",
    },
  },
};
