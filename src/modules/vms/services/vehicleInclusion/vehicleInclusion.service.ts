import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import lodash from "lodash";
import { buildUpdateWithWhereSql } from "../../../../utils/sql-builder.util";
import BadRequestError from "../../../../errors/bad-request.error";

@Service()
export class VehicleServices {
  constructor() {}

  async getDriverList() {
    const pool = db.getConnection("slave");
    const driverListSql = "SELECT * FROM vehicle.driver_info ORDER BY id ASC";
    let driverList = (await pool.query(driverListSql)).rows;
    
    return driverList.length > 0 ? toCamelKeys(driverList) : {};
  }



 

  async createVehicle(data: any) {
    const pool = db.getConnection("master")
      let result, message;
      if(data.id){
        let { sql, params } = buildUpdateWithWhereSql("vehicle.driver_info",{id: data.id}, { ...lodash.omit(data), updatedBy:data.createdBy, updatedAt:new Date()  });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে হালনাগাদ করা হয়েছে";
      }else{
        let { sql, params } = buildInsertSql("vehicle.driver_info", { ...lodash.omit(data) });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে তৈরি করা হয়েছে";
      }
      return result && message ? toCamelKeys({result, message}) as any : {}
  }

  
}
