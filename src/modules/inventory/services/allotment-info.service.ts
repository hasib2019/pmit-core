import db from "../../../db/connection.db";
import { BadRequestError, buildInsertSql, buildGetSql, buildUpdateSql, buildUpsertSql } from "rdcd-common";
import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import { AllotmentInfoAttr } from "../interfaces/allotment-info.interface";
import { PoolClient } from "pg";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import { compareTwoObjectAndMakeUpdateHistory } from "../utils/compareTwoObjectAndMakeUpdateHistory";

@Service()
export class AllotmentInfoService {
  constructor() {}
  async getAllotmentInfo2(layerId: number, unitId?: number) {
    const connection = db.getConnection("slave");

    try {
      const itemInfoSql = `select id, item_name from inventory.item_info`;
      const allotmentSql = `select item_id, origin_designation_id,quantity from inventory.allotment_info`;
      const designationSql = `select id, name_bn from master.office_origin_designation
      where origin_id = $1  and origin_unit_id = $2`;

      const allItemInfos = (await connection.query(itemInfoSql)).rows;
      const allAllotmentInfos = (await connection.query(allotmentSql)).rows;
      const allDesignations = (await connection.query(designationSql, [layerId, unitId])).rows;

      const myArray = [];

      for (const item of allItemInfos) {
        const designations = allDesignations.map((d) => {
          const qty = allAllotmentInfos.find((a) => a.origin_designation_id == d.id && a.item_id == item.id);

          return {
            designationWiseAllotmentInfo: {
              itemId: item.id,
              quantity: qty ? qty.quantity : "",
              designationId: d.id,
            },
          };
        });

        myArray.push({
          itemNameBn: item.item_name,
          item: designations,
        });
      }

      return {
        allotmentInfo: myArray,
        designations: allDesignations,
      };
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getAllotmentInfo(layerId: number, unitId?: number) {
   
    const connection = db.getConnection("slave");

    try {
      const itemInfoSql = `select id, item_name from inventory.item_info`;
      const allotmentSql = `select item_id, origin_designation_id, quantity from inventory.allotment_info`;
      const designationSql = `select id, name_bn from master.office_origin_designation
          where origin_id = $1  and origin_unit_id = $2`;

      const allItemInfos = (await connection.query(itemInfoSql)).rows;
      const allAllotmentInfos = (await connection.query(allotmentSql)).rows;
      const allDesignations = (await connection.query(designationSql, [layerId, unitId])).rows;

      const allotmentMap: any = {}; // use an object to store allotment info

      for (const allotment of allAllotmentInfos) {
        const key = `${allotment.item_id}-${allotment.origin_designation_id}`;
        allotmentMap[key] = allotment.quantity;
      }
     

      const myArray = allItemInfos.map((item) => {
        const designations = allDesignations.map((designation) => {
          const qty = allotmentMap[`${item.id}-${designation.id}`]; // access allotment info from the map
          return {
            designationWiseAllotmentInfo: {
              itemId: item.id,
              quantity: qty ? qty : "",
              designationId: designation.id,
            },
          };
        });
        return {
          itemNameBn: item.item_name,
          item: designations,
        };
      });

      return {
        allotmentInfo: myArray,
        designations: allDesignations,
      };
     
      // const connection = db.getConnection("slave");

      // try {
      //   const itemInfoSql = `select id, item_name from inventory.item_info`;
      //   const allotmentSql = `select item_id, origin_designation_id, quantity from inventory.allotment_info`;
      //   const designationSql = `select id, name_bn from master.office_origin_designation
      //       where origin_id = $1  and origin_unit_id = $2`;

      //   const allItemInfos = (await connection.query(itemInfoSql)).rows;
      //   const allAllotmentInfos = (await connection.query(allotmentSql)).rows;
      //   const allDesignations = (await connection.query(designationSql, [layerId, unitId])).rows;

      //   const allotmentMap: any = {}; // use an object to store allotment info

      //   for (const allotment of allAllotmentInfos) {
      //     const key = `${allotment.item_id}-${allotment.origin_designation_id}`;
      //     allotmentMap[key] = allotment.quantity;
      //   }
  

      //   const myArray = [];

      //   for (const item of allItemInfos) {
      //     const designations = allDesignations.map((d) => {
      //       const qty = allotmentMap[`${item.id}-${d.id}`]; // access allotment info from the map

      //       return {
      //         designationWiseAllotmentInfo: {
      //           itemId: item.id,
      //           quantity: qty ? qty : "",
      //           designationId: d.id,
      //         },
      //       };
      //     });

      //     myArray.push({
      //       itemNameBn: item.item_name,
      //       item: designations,
      //     });
      //   }

      //   return {
      //     allotmentInfo: myArray,
      //     designations: allDesignations,
      //   };
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getOfficeOrigin(doptorId: Number) {
    const connection = db.getConnection("slave");
    try {
      const officeOriginSql = `SELECT * FROM master.office_origin WHERE id in 
(SELECT DISTINCT origin_id FROM master.office_info WHERE doptor_id = $1)`;
      const result = (await connection.query(officeOriginSql, [doptorId])).rows;
      return toCamelKeys(result);
    } catch (error: any) {}
  }
  async getAllOfficeUnitByDoptor(doptortId: Number) {
    const connection = db.getConnection("slave");
    try {
      const officeUnitSql = `select a.id,a.name_bn from master.office_unit
      a inner join master.office_info b
      on a.office_id = b.id where b.doptor_id =$1`;
      const result = (await connection.query(officeUnitSql, [doptortId])).rows;
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  isAllotmentExist(allotmentInfo: AllotmentInfoAttr, allAllotmentInfos: any) {
    let id;

    const flag = allAllotmentInfos.some((allotment: any) => {
      if (
        allotment.originDesignationId == allotmentInfo.originDesignationId &&
        allotment.itemId == allotmentInfo.itemId
      ) {
        id = allotment.id;
      }
      return (
        allotment.originDesignationId == allotmentInfo.originDesignationId && allotment.itemId == allotmentInfo.itemId
      );
    });
    return {
      flag: flag,
      id: id,
    };
  }
  async insertAllotment(allotmentData: AllotmentInfoAttr, connection: PoolClient, userId: String) {
    try {
      allotmentData.createdAt = new Date();
      allotmentData.createdBy = userId;
      const { sql, params } = buildInsertSql("inventory.allotment_info", allotmentData);
      const result = (await connection.query(sql, params)).rows[0]?.id;
      return result;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async updateAllotment(allotmentData: AllotmentInfoAttr, connection: PoolClient, id: number, userId: String) {
    allotmentData.updatedAt = new Date();
    allotmentData.updatedBy = userId;
    const updateHistory = await compareTwoObjectAndMakeUpdateHistory("inventory.allotment_info", allotmentData, id);
    allotmentData.updateHistory = updateHistory;
    const { sql, params } = buildUpdateSql("inventory.allotment_info", id, allotmentData, "id");
    try {
      const result = (await connection.query(sql, params)).rows[0]?.id;
      return result;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async upsertAllotment(allotmentDataArra: AllotmentInfoAttr[], userId: String) {
    const connection = db.getConnection("slave");
    const pool: PoolClient = await db.getConnection("master").connect();
    const allotmentSql = `select id,item_id, origin_designation_id,quantity from inventory.allotment_info`;
    const allAllotmentInfos = toCamelKeys((await connection.query(allotmentSql)).rows);
    const allotmentArray = [];

    if (allotmentDataArra.length > 0) {
      try {
        for (let allotmentInfo of allotmentDataArra) {
          pool.query("BEGIN");
          const isExist = await this.isAllotmentExist(allotmentInfo, allAllotmentInfos);
          const id = Number(isExist.id);
          if (isExist.flag) {
            const result = await this.updateAllotment(allotmentInfo, pool, id, userId);

            allotmentArray.push(result);
          } else {
            const result = await this.insertAllotment(allotmentInfo, pool, userId);
            allotmentArray.push(result);
          }

          pool.query("COMMIT");
        }
        return toCamelKeys(allotmentArray);
      } catch (error: any) {
        pool.query("ROLLBACK");
        throw new BadRequestError(error);
      } finally {
        pool.release();
      }
    }
  }
}
