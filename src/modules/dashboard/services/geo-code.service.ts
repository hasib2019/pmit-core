/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-13 14:53:52
 * @modify date 2022-04-13 14:53:52
 * @desc [description]
 */

import axios from "axios";
import { buildGetSql, buildUpsertSql } from "rdcd-common";
import { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import db from "../../../db/connection.db";
import { ComponentType } from "../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";

@Service()
export class GeoCodeSyncService extends Dashboard {
  constructor(component: ComponentType) {
    super(component);
  }

  //get geo types
  async getGeoTypes() {
    const res = await axios.get(`${dashboardUrl}/api/v1/geo/types`, await this.getConfig());

    if (res.status === 200) {
      return res.data as Object;
    }
    return {};
  }

  //get geo data by types
  async getGeoData(type: string) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/geo/types/${type}/locations`, await this.getConfig());
      if (res.status == 200) {
        return res.data.data as Array<Object>;
      }
    } catch (error: any) {
      console.log({ zoneError: error });
      await this.syncLogService.storeLog(
        "geo_data_sync",
        error.config.url as string,
        error.config.data,
        undefined,
        error?.response?.statusText
          ? JSON.stringify({ error_message: error.response.statusText })
          : JSON.stringify(error),
        error?.response?.status ? error.response.status : 500,
        false
      );
    }
  }

  //sync function
  async syncData() {
    const types = await this.getGeoTypes();
    const keys = Object.keys(types);
    let response = {
      divisionCount: 0,
      districtCount: 0,
      upazilaCount: 0,
      unionCount: 0,
      cityCorpCount: 0,
      thanaCount: 0,
      paurasabhaCount: 0,
    };
    for await (const key of keys) {
      const data = (await this.getGeoData(key)) as any;
      if (key == "1") {
        let divisionCount = 0;
        for await (const d of data) {
          this.upsertDivisionData(d);
          divisionCount += 1;
        }
        response["divisionCount"] = divisionCount;
      }
      if (key == "2") {
        let districtCount = 0;
        for await (const d of data) {
          this.upsertDistrictData(d);
          districtCount += 1;
        }
        response["districtCount"] = districtCount;
      }
      if (key == "3") {
        let upazilaCount = 0;
        for await (const d of data) {
          this.upsertUpazilaData(d);
          upazilaCount += 1;
        }
        response["upazilaCount"] = upazilaCount;
      }
      if (key == "4") {
        let unionCount = 0;
        const filteredData = data.filter((d: any) => d.id != 5098);
        for await (const d of filteredData) {
          this.upsertUnionData(d);
          unionCount += 1;
        }
        response["unionCount"] = unionCount;
      }
      if (key == "5") {
        let cityCorpCount = 0;
        for await (const d of data) {
          this.upsertCityCorpData(d);
          cityCorpCount += 1;
        }
        response["cityCorpCount"] = cityCorpCount;
      }
      if (key == "6") {
        let thanaCount = 0;
        for await (const d of data) {
          this.upsertThanaData(d);
          thanaCount += 1;
        }
        response["thanaCount"] = thanaCount;
      }
      if (key == "7") {
        let paurasabhaCount = 0;
        for await (const d of data) {
          this.upsertPaurasabhaData(d);
          paurasabhaCount += 1;
        }
        response["paurasabhaCount"] = paurasabhaCount;
      }
    }

    const zoneMaterializedViewRefreshStaus = await this.refreshZoneMaterializedView();
    return { ...response, zoneMaterializedViewRefreshStaus };
  }

  //division
  async upsertDivisionData(data: any) {
    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.division_info",
      "id",
      {
        id: data.id,
        divisionName: data.name.en,
        divisionNameBangla: data.name.bn,
        divisionCode: data.bbs_code,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //district
  async upsertDistrictData(data: any) {
    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.district_info",
      "id",
      {
        id: data.id,
        districtName: data.name.en,
        districtNameBangla: data.name.bn,
        districtCode: data.bbs_code,
        divisionId: data.parent_id,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //upazila
  async upsertUpazilaData(data: any) {
    const divisionId = await this.getDivisionIdbyDistrict(data.parent_id);

    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.upazila_info",
      "id",
      {
        id: data.id,
        upazilaName: data.name.en,
        upazilaNameBangla: data.name.bn,
        upazilaCode: data.bbs_code,
        divisionId,
        districtId: data.parent_id,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //union
  async upsertUnionData(data: any) {
    const ids = await this.getDistrictDivisionIdbyUpazila(data.parent_id);

    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.union_info",
      "id",
      {
        id: data.id,
        unionName: data.name.en,
        unionNameBangla: data.name.bn,
        unionCode: data.bbs_code,
        divisionId: ids.division_id,
        districtId: ids.district_id,
        upazilaId: data.parent_id,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //city corp
  async upsertCityCorpData(data: any) {
    const divisionId = await this.getDivisionIdbyDistrict(data.parent_id);

    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.city_corp_info",
      "id",
      {
        id: data.id,
        cityCorpName: data.name.en,
        cityCorpNameBangla: data.name.bn,
        cityCorpCode: data.bbs_code,
        divisionId,
        districtId: data.parent_id,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //thana
  async upsertThanaData(data: any) {
    let divisionId = null;
    let districtId = null;

    if (data.parent_id) {
      const { division_id, district_id } = await this.getDistrictDivisionByCityCorp(data.parent_id);
      divisionId = division_id;
      districtId = district_id;
    }

    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.thana_info",
      "id",
      {
        id: data.id,
        thanaName: data.name.en,
        thanaNameBangla: data.name.bn,
        thanaCode: data.bbs_code,
        divisionId,
        districtId,
        cityCorpId: data.parent_id,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //paurasabha
  async upsertPaurasabhaData(data: any) {
    let divisionId = null;
    let districtId = null;

    if (data.parent_id) {
      const ids = await this.getDistrictDivisionIdbyUpazila(data.parent_id);
      divisionId = ids.division_id;
      districtId = ids.district_id;
    }

    const connection = await db.getConnection("master");

    const { sql, params } = buildUpsertSql(
      "master.paurasabha_info",
      "id",
      {
        id: data.id,
        paurasabhaName: data.name.en,
        paurasabhaNameBangla: data.name.bn,
        paurasabhaCode: data.bbs_code,
        divisionId,
        districtId,
        upazilaId: data.parent_id,
        createdBy: "dashboard",
        createdAt: new Date(),
      },
      {
        updatedBy: "dashboard",
        updatedAt: new Date(),
      },
      ["createdAt", "createdBy"]
    );

    await connection.query(sql, params);
  }

  //get division id
  async getDivisionIdbyDistrict(id: string) {
    const connection = await db.getConnection("master");

    const query = buildGetSql(["division_id"], "master.district_info", { id });

    const {
      rows: [{ division_id }],
    } = await connection.query(query.queryText, query.values);

    return division_id;
  }

  //get district id
  async getDistrictDivisionIdbyUpazila(id: string) {
    const connection = await db.getConnection("master");

    const query = buildGetSql(["district_id", "division_id"], "master.upazila_info", { id });

    const {
      rows: [data],
    } = await connection.query(query.queryText, query.values);

    return data;
  }

  //get district division
  async getDistrictDivisionByCityCorp(id: string) {
    const connection = await db.getConnection("master");

    const query = buildGetSql(["district_id", "division_id"], "master.city_corp_info", { id });

    const {
      rows: [data],
    } = await connection.query(query.queryText, query.values);

    return data;
  }

  //zone materialize view update
  async refreshZoneMaterializedView() {
    const pool = db.getConnection("master");
    let sqls = [
      `REFRESH MATERIALIZED VIEW  master.mv_upazila_city_info;`,
      `REFRESH MATERIALIZED VIEW  master.mv_union_thana_paurasabha_info;`,
    ];
    var updateInfo = [];
    for (const sql of sqls) updateInfo.push(await pool.query(sql));

    return updateInfo.length === 2 ? true : false;
  }
}
