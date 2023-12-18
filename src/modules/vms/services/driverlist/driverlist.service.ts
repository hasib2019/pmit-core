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



 

  async createDriver(data: any) {
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

  

  async getVehicle() {
    const pool = db.getConnection("slave");
    const vehicleListSql = "SELECT id,office_id,name,model,reg_num,payment_type_id,payment_frq_id,price,cc,sit_no,purcahse_date,chassis_num,insurance_no,fitness,category_id,start_mile,servicing_mile,servicing_day,fuel_type_id,status_id,driver_id,details  FROM vehicle.vehicle_info ORDER BY id ASC";
    let vehicleList = (await pool.query(vehicleListSql)).rows;
    
    return vehicleList.length > 0 ? toCamelKeys(vehicleList) : {};
  }




  async createVehicle(data: any) {
    const pool = db.getConnection("master")
      let result, message;
      if(data.id){
        let { sql, params } = buildUpdateWithWhereSql("vehicle.vehicle_info",{id: data.id}, { ...lodash.omit(data), updatedBy:data.createdBy, updatedAt:new Date()  });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে হালনাগাদ করা হয়েছে";
      }else{
        let { sql, params } = buildInsertSql("vehicle.vehicle_info", { ...lodash.omit(data) });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে তৈরি করা হয়েছে";
      }
      return result && message ? toCamelKeys({result, message}) as any : {}
  }



  async createPump(data: any) {
    const pool = db.getConnection("master")
      let result, message;
      if(data.id){
        let { sql, params } = buildUpdateWithWhereSql("vehicle.petrol_pump",{id: data.id}, { ...lodash.omit(data), updatedBy:data.createdBy, updatedAt:new Date()  });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে হালনাগাদ করা হয়েছে";
      }else{
        let { sql, params } = buildInsertSql("vehicle.petrol_pump", { ...lodash.omit(data) });
        result = (await pool.query(sql, params)).rows[0];
        message = "সফলভাবে তৈরি করা হয়েছে";
      }
      return result && message ? toCamelKeys({result, message}) as any : {}
  }


  async getPetrolPump() {
    const pool = db.getConnection("slave");
    const pumpListSql = "SELECT id,name, address,contact_person, mob_num FROM vehicle.petrol_pump ORDER BY id ASC";
    let pumpList = (await pool.query(pumpListSql)).rows;
    return pumpList.length > 0 ? toCamelKeys(pumpList) : {};
  }


}
