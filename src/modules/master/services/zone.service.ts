import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export default class ZoneService {
  constructor() {}

  async getDivision(divisionId: number) {
    const pool = db.getConnection("slave");
    let sql = `SELECT id, division_code, division_name, division_name_bangla FROM master.division_info
                   WHERE id = $1`;
    const divisionInfo =  (await pool.query(sql, [divisionId])).rows;
    return divisionInfo.length > 0 ? (toCamelKeys(divisionInfo) as any) : [];
  }

  async getDistrict(divisionId: number | null, districtId: number | null, layerId: number | null) {
    const pool = db.getConnection("slave");
    let sql: string;
    let districtInfo;
    if ((!divisionId && !districtId) || layerId == 5) {
      sql = `SELECT id, district_code, district_name, district_name_bangla FROM master.district_info`;
      districtInfo =  (await pool.query(sql)).rows;
    } else if ((districtId && districtId > 0) || layerId == (3 | 6)) {
      sql = `SELECT id, district_code, district_name, district_name_bangla FROM master.district_info
                        WHERE division_id = $1 AND id = $2`;
      districtInfo =  (await pool.query(sql, [divisionId, districtId])).rows;
    } else {
      sql = `SELECT id, district_code, district_name, district_name_bangla FROM master.district_info
                        WHERE division_id = $1`;
      districtInfo =  (await pool.query(sql, [divisionId])).rows;
    }

    return districtInfo.length > 0 ? (toCamelKeys(districtInfo) as any) : [];
  }

  async getUpazila(divisionId: number | null, districtId: number | null, upazilaId: number | null) {
    const pool = db.getConnection("slave");
    let sql: string;
    let upazilaInfo;
    if (!divisionId && !districtId && !upazilaId) {
      sql = `SELECT upa_city_id, upa_city_code, upa_city_name, upa_city_name_bangla, upa_city_type FROM master.mv_upazila_city_info ORDER BY upa_city_type ASC`;
      upazilaInfo = await (await pool.query(sql)).rows;
    } else if (!divisionId && districtId && !upazilaId) {
      sql = `SELECT upa_city_id, upa_city_code, upa_city_name, upa_city_name_bangla, upa_city_type FROM master.mv_upazila_city_info WHERE district_id = $1 ORDER BY upa_city_type ASC`;
      upazilaInfo = await (await pool.query(sql, [districtId])).rows;
    } else if (districtId && districtId > 0 && upazilaId && upazilaId > 0) {
      sql = `SELECT upa_city_id, upa_city_code, upa_city_name, upa_city_name_bangla, upa_city_type FROM master.mv_upazila_city_info WHERE division_id = $1 AND district_id = $2 AND upa_city_id = $3 ORDER BY upa_city_type ASC`;
      upazilaInfo = await (await pool.query(sql, [divisionId, districtId, upazilaId])).rows;
    } else if (districtId && districtId > 0 && upazilaId && upazilaId <= 0) {
      sql = `SELECT upa_city_id, upa_city_code, upa_city_name, upa_city_name_bangla, upa_city_type FROM master.mv_upazila_city_info WHERE division_id = $1 AND district_id = $2 ORDER BY upa_city_type ASC`;
      upazilaInfo = await (await pool.query(sql, [divisionId, districtId])).rows;
    } else {
      sql = `SELECT upa_city_id, upa_city_code, upa_city_name, upa_city_name_bangla, upa_city_type FROM master.mv_upazila_city_info WHERE division_id = $1 ORDER BY upa_city_type ASC`;
      upazilaInfo = await (await pool.query(sql, [divisionId])).rows;
    }

    return upazilaInfo.length > 0 ? (toCamelKeys(upazilaInfo) as any) : [];
  }

  async getUnion(divisionId?: any, districtId?: any, upazilaId?: any, type?: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: string;
    let unionInfo;
    if (!divisionId && !districtId && !upazilaId) {
      sql = `SELECT uni_thana_paw_id, uni_thana_paw_code, uni_thana_paw_name, uni_thana_paw_name_bangla, uni_thana_paw_type FROM master.mv_union_thana_paurasabha_info ORDER BY uni_thana_paw_type ASC`;
      unionInfo = await (await pool.query(sql)).rows;
    } else if (!divisionId && !districtId && upazilaId) {
      sql = `SELECT uni_thana_paw_id, uni_thana_paw_code, uni_thana_paw_name, uni_thana_paw_name_bangla, uni_thana_paw_type FROM master.mv_union_thana_paurasabha_info WHERE upa_city_id = $1 AND upa_city_type = $2 ORDER BY uni_thana_paw_type ASC`;
      unionInfo = await (await pool.query(sql, [upazilaId, type])).rows;
    } else if (districtId > 0 && upazilaId > 0) {
      sql = `SELECT uni_thana_paw_id, uni_thana_paw_code, uni_thana_paw_name, uni_thana_paw_name_bangla, uni_thana_paw_type FROM master.mv_union_thana_paurasabha_info
      WHERE division_id = $1 AND district_id = $2 AND upa_city_id = $3 AND upa_city_type = $4 ORDER BY uni_thana_paw_type ASC`;
      unionInfo = await (await pool.query(sql, [divisionId, districtId, upazilaId, type])).rows;
    } else if (districtId > 0 && upazilaId <= 0) {
      sql = `SELECT uni_thana_paw_id, uni_thana_paw_code, uni_thana_paw_name, uni_thana_paw_name_bangla, uni_thana_paw_type FROM master.mv_union_thana_paurasabha_info WHERE division_id = $1 AND district_id = $2 ORDER BY uni_thana_paw_type ASC`;
      unionInfo = await (await pool.query(sql, [divisionId, districtId])).rows;
    } else {
      sql = `SELECT uni_thana_paw_id, uni_thana_paw_code, uni_thana_paw_name, uni_thana_paw_name_bangla, uni_thana_paw_type FROM master.mv_union_thana_paurasabha_info WHERE division_id = $1 ORDER BY uni_thana_paw_type ASC`;
      unionInfo = await (await pool.query(sql, [divisionId])).rows;
    }

    return unionInfo.length > 0 ? (toCamelKeys(unionInfo) as any) : [];
  }

  async getZoneName(districtId: any, upazilaId: any, unionId: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: string;
    let zoneInfo;
    sql = `SELECT a.district_name, a.district_name_bangla, b.upazila_name, b.upazila_name_bangla, 
              c.union_name, c.union_name_bangla 
            FROM master.district_info a, master.upazila_info b, master.union_info c 
            WHERE a.id = b.district_id and b.id = c.upazila_id and a.id = $1 and
              b.id = $2 and c.id = $3`;
    zoneInfo = await (await pool.query(sql, [districtId, upazilaId, unionId])).rows[0];

    return zoneInfo ? (toCamelKeys(zoneInfo) as any) : [];
  }
}
