import { toCamelKeys } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export default class OfficeService {
  constructor() {}

  async getOffice(doptorOfficeId: number): Promise<any> {
    const pool = db.getConnection("slave");
    let sql = `SELECT a.id, a.name_bn as office_name, a.doptor_id, b.name_bn as doptor_name, a.division_id, a.district_id, a.upazila_id, a.layer_id FROM master.office_info a INNER JOIN master.doptor_info b ON a.doptor_id = b.id WHERE a.id = $1`;
    const doptorOffice = await (await pool.query(sql, [doptorOfficeId])).rows;
    return doptorOffice.length > 0 ? (toCamelKeys(doptorOffice[0]) as any) : [];
  }

  async getOfficeUnit(unitId: number): Promise<any> {
    const pool = db.getConnection("slave");
    let sql = `SELECT id, name_bn FROM master.office_unit
                   WHERE id = $1`;
    const unitInfo = await (await pool.query(sql, [unitId])).rows;
    return unitInfo.length > 0 ? (toCamelKeys(unitInfo[0]) as any) : undefined;
  }

  async getOfficeUnitOrganogram(organogramId: number): Promise<any> {
    const pool = db.getConnection("slave");
    let sql = `SELECT id, name_bn FROM master.office_unit_organogram
                   WHERE id = $1`;
    const organogramInfo = await (await pool.query(sql, [organogramId])).rows;
    return organogramInfo.length > 0 ? (toCamelKeys(organogramInfo[0]) as any) : undefined;
  }

  async getLoanPurpose(doptorId: number, projectId: number): Promise<any> {
    const pool = db.getConnection("slave");
    let sql = `SELECT a.id, a.purpose_name 
              FROM master.loan_purpose a
                inner join master.loan_purpose_mapping b
                  on a.id=b.purpose_id
              WHERE doptor_id = $1 AND project_id = $2`;
    const loanPurpose = await (await pool.query(sql, [doptorId, projectId])).rows;
    return loanPurpose.length > 0 ? (toCamelKeys(loanPurpose) as any) : [];
  }

  //get child office by parent office
  async getChildOffice(doptorId: number, officeId: number, layerId?: number){
    const pool = db.getConnection("slave");
    let sql;
    let result;
    if (layerId) {
      sql = `WITH
              RECURSIVE office_data
              AS
                (SELECT id,
                        parent_id,
                        name_bn,
                        layer_id
                    FROM master.office_info
                  WHERE id = $1
                  UNION
                  SELECT a.id,
                        a.parent_id,
                        a.name_bn,
                        a.layer_id
                    FROM master.office_info a
                        INNER JOIN office_data b ON a.doptor_id = $2 AND b.id = a.parent_id 
            )
          SELECT *
            FROM office_data
          WHERE layer_id = $3
            order by id`;
      result = (await pool.query(sql, [officeId, doptorId, layerId])).rows;
    } else {
      sql = `SELECT id, name_bn, name_en FROM master.office_info WHERE doptor_id = $1`;
      result = (await pool.query(sql, [doptorId])).rows;
    }
    return result.length > 0 ? (toCamelKeys(result) as any) : [];
  }

  async getDoptorOfficeForInventory(
    doptorId: number | undefined,
    layerId: number | undefined,
    divisionId: number | undefined,
    districtId: number | undefined,
    upazilaId: number | undefined
  ): Promise<any> {
    const pool = db.getConnection("slave");
    let sql;
    let result;
    if (layerId) {
      sql = `SELECT  *
      FROM master.office_info 
      WHERE doptor_id = $1 AND
      layer_id = $2 AND
      (division_id = $3 OR district_id = $4 OR upazila_id = $5)`;
      result = (await pool.query(sql, [doptorId, layerId, divisionId, districtId, upazilaId])).rows;
    } else {
      sql = `SELECT * FROM master.office_info `;
      result = (await pool.query(sql)).rows;
    }
    return result.length > 0 ? (toCamelKeys(result) as any) : [];
  }

  //get office unit by office id
  async getUnitOfOffice(officeId: number): Promise<any> {
    const pool = db.getConnection("slave");
    try {
      let sql;
      let result;

      sql = `SELECT  *
      FROM master.office_unit 
      WHERE office_id = $1`;
      result = (await pool.query(sql, [officeId])).rows;

      return result.length > 0 ? (toCamelKeys(result) as any) : [];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
}
