/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-20 10:34:22
 * @modify date 2022-04-20 10:34:22
 * @desc [description]
 */

import axios from "axios";
import { buildUpsertSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import pgConnect from "../../../db/connection.db";
import { ComponentType } from "../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";
import { SyncLogService } from "./log.service";

@Service()
export class DoptorSyncService extends Dashboard {
  protected syncLogService = Container.get(SyncLogService);

  constructor(component: ComponentType) {
    super(component);
  }
  async test() {
    let allRes = [];
    for (let i = 0; i < 10; i++) {
      let res = await axios.get("localhost:8090/doptor-sync/test/time/make-api-calls");
      allRes.push(res);
    }
    return allRes;
  }
  async getDoptor() {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/doptors`, await this.getConfig());

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ doptorError: error });
      await this.syncLogService.storeLog(
        "process_doptor_sync",
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

  async getOfficeLayer(token: any) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/layers`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ layerError: error });
      await this.syncLogService.storeLog(
        "process_office_layer_sync",
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

  async getOfficeInfo(doptorId: number, token: any, officeId?: number) {
    let officeInfo = [];
    console.log("==========================================================================");
    console.log({ arguments });

    try {
      if (officeId && officeId != 1) {
        const res = await axios.get(`${dashboardUrl}/api/v1/organogram/doptors/${officeId}/allchildren`, token);
        if (res.status === 200) {
          if (res?.data && res.data.length === 0 && doptorId != 1) {
            const doptorWiseRes = await axios.get(
              `${dashboardUrl}/api/v1/organogram/doptors/${doptorId}/allchildren`,
              token
            );
            if (doptorWiseRes.status === 200) {
              officeInfo = doptorWiseRes.data.filter((value: any) => value.id == officeId);
            }
          } else {
            officeInfo = res.data;
          }
        }
      } else if (doptorId != 1) {
        const doptorWiseRes = await axios.get(
          `${dashboardUrl}/api/v1/organogram/doptors/${doptorId}/allchildren`,
          token
        );
        if (doptorWiseRes.status === 200) {
          officeInfo = doptorWiseRes.data;
        }
      }

      if (doptorId && !officeId) {
        let allHeadOfficesWithMinistry = await this.getHeadOfficesWithMinistry(token, 1);
        let doptor = allHeadOfficesWithMinistry?.filter((value: any) => value.id == doptorId);
        if (doptor && doptor?.length > 0) {
          officeInfo.push(doptor[0]);
        }
      }
      return officeInfo as Array<any>;
    } catch (error: any) {
      console.log({ officeError: error });
      await this.syncLogService.storeLog(
        "process_office_sync",
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

  async getHeadOfficesWithMinistry(token: any, doptorId: number) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/doptors/${doptorId}/children`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ headOfficesWithMinistryError: error });
      await this.syncLogService.storeLog(
        "process_head_office_sync",
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

  async getOfficeOrigin(token: any) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/origins`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ officeOriginError: error });
      await this.syncLogService.storeLog(
        "process_office_origin_sync",
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

  async getOfficeOriginDesignation(officeId: number, token: any) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/office/${officeId}/origin_designations`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ officeOriginDesignationError: error });
      await this.syncLogService.storeLog(
        "process_origin_designations_sync",
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

  async getOfficeUnit(officeId: number, token: any) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/office/${officeId}/units`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ officeUnitError: error });
      await this.syncLogService.storeLog(
        "process_office_units_sync",
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

  async getOfficeDesignation(officeId: number, token: any) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/office/${officeId}/designations`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ officeDesignationError: error });
      await this.syncLogService.storeLog(
        "process_designations_sync",
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

  async getOfficeEmployee(officeUnitId: number, token: any) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/unit/${officeUnitId}/employees`, token);

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error: any) {
      console.log({ officeEmployeeError: error });
      await this.syncLogService.storeLog(
        "process_employees_sync",
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

  async getAssociations(officeId: number) {
    let res = await axios.get(`${dashboardUrl}/api/v1/doptors/10/associations`, await this.getConfig());
    if (res.status === 200) {
      // let samityData = res.data.filter((value: any) => value.office_id == officeId);
      return res.data as Array<any>;
    }
    return [];
  }

  async getMembersByAssociation(associationId: number) {
    let res = await axios.get(
      `${dashboardUrl}/api/v1/associations/${associationId}/beneficiaries`,
      await this.getConfig()
    );
    if (res.status === 200) {
      return res.data as Array<any>;
    }
    return [];
  }

  ///// syncData by doptor ////////
  async syncData(token: any, doptorId?: number) {
    console.log("syncData");

    const syncByDoptor = await this.syncByDoptor(token, doptorId);
    const OfficeOrigin = await this.syncOfficeOrigin(token);
    const officeLayer = await this.syncOfficeLayer(token);

    return {
      syncByDoptor,
      OfficeOrigin,
      officeLayer,
    };
  }

  async syncByDoptor(token: any, doptorId?: number) {
    console.log("syncByDoptor");

    // const doptors = await this.getDoptor();
    let doptors = [] as any;
    let count: any = {};
    if (doptorId) {
      let allHeadOfficesWithMinistry = await this.getHeadOfficesWithMinistry(token, 1);
      doptors = allHeadOfficesWithMinistry?.filter((value: any) => value.id == doptorId);
    } else {
      doptors = await this.getHeadOfficesWithMinistry(token, 1);
    }
    // doptors = doptorId
    //   ? [{ id: doptorId }]
    //   : [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }];

    try {
      for (const doptor of doptors) {
        console.log("traversing doptors======================================", doptor.id);

        const office = await this.syncOfficeInfo(doptor.id, token);
        const officeMaterializedViewRefreshStaus = await this.refreshOfficeMaterializedView();
        const syncByOffice = await this.syncByOffice(doptor.id, token);

        count[`${doptor.id}`] = doptor.id;
        count[doptor.id] = {
          office,
          officeMaterializedViewRefreshStaus,
          syncByOffice,
        };
      }
    } catch (error) {
      console.log(error);
    }
    console.log({ rootCount: count });

    return count;
  }

  async syncByOffice(doptorId: number, token: any, officeId?: number) {
    let offices;
    if (officeId) {
      offices = await this.getOfficeInfo(doptorId, token, officeId);
    } else {
      offices = await this.getOfficeInfo(doptorId, token);
    }

    let count: any = {};

    try {
      if (offices && offices.length > 0) {
        for (const office of offices) {
          const officeOriginDesignation = await this.syncOfficeOriginDesignation(office.id, token);
          // console.log({ officeOriginDesignation });

          const officeUnitSyncRes = await this.syncOfficeUnit(office.id, token);
          const officeDesignation = await this.syncOfficeDesignation(office.id, token);

          count[`${office.id}`] = office.id;
          count[office.id] = {
            officeOriginDesignation,
            officeUnit: officeUnitSyncRes.officeUnitCount,
            officeEmployee: officeUnitSyncRes.officeUnitEmployeeCount,
            officeDesignation,
          };
        }
      }
    } catch (error) {
      console.log(error);
    }
    return count;
  }

  async syncDoptor() {
    const doptors = await this.getDoptor();

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (doptors && doptors?.length > 0) {
      for (const doptor of doptors) {
        const { sql, params } = buildUpsertSql(
          "master.doptor_info",
          "id",
          {
            id: doptor.id,
            nameEn: doptor.name.en,
            nameBn: doptor.name.bn,
            digitalNothiCode: doptor.digital_nothi_code || null,
            officePhone: doptor.office_phone || null,
            officeMobile: doptor.office_mobile || null,
            officeFax: doptor.office_fax || null,
            officeEmail: doptor.office_email || null,
            officeWeb: doptor.office_web || null,
            officeMinistryId: doptor.office_ministry_id || null,
            originId: doptor.origin.id || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ doptorCount: count });

    return count;
  }

  async syncOfficeLayer(token: any) {
    const layers = await this.getOfficeLayer(token);

    const connection = await pgConnect.getConnection("master");
    let count = 0;
    if (layers && layers?.length > 0) {
      for (const layer of layers) {
        const { sql, params } = buildUpsertSql(
          "master.office_layer",
          "id",
          {
            id: layer.id,
            nameEn: layer.name.en,
            nameBn: layer.name.bn,
            parentId: layer.parent_id || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ layersCount: count });

    return count;
  }

  async syncOfficeInfo(doptorId: number, token: any, officeId?: number) {
    console.log("syncOfficeInfo");

    let offices;
    if (officeId) {
      offices = await this.getOfficeInfo(doptorId, token, officeId);
    } else {
      offices = await this.getOfficeInfo(doptorId, token);
    }

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (offices && offices.length > 0) {
      for (const office of offices) {
        const { sql, params } = buildUpsertSql(
          "master.office_info",
          "id",
          {
            id: office.id,
            nameEn: office.name.en,
            nameBn: office.name.bn,
            digitalNothiCode: office.digital_nothi_code || null,
            officePhone: office.office_phone || null,
            officeMobile: office.office_mobile || null,
            officeFax: office.office_fax || null,
            officeEmail: office.office_email || null,
            officeWebsite: office.office_web || null,
            officeMinistryId: office.office_ministry_id || null,
            originId: office.origin.id || null,
            doptorId,
            divisionId: office.geo.division_id || null,
            districtId: office.geo.district_id || null,
            upazilaId: office.geo.upazila_id || null,
            parentId: office.parent.id || null,
            layerId: office.layer.id || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );
        // console.log({ sql, params });

        try {
          await connection.query(sql, params);
          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ officeCount: count });

    return count;
  }

  async syncOfficeOrigin(token: any) {
    const origins = await this.getOfficeOrigin(token);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (origins && origins.length > 0) {
      for (const origin of origins) {
        const { sql, params } = buildUpsertSql("master.office_origin", "id", {
          id: origin.id,
          nameEn: origin.name.en,
          nameBn: origin.name.bn,
          parentId: origin.parent.id || null,
          layerId: origin.layer.id || null,
        });

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ officeOriginCount: count });

    return count;
  }

  async syncOfficeOriginDesignation(officeId: number, token: any) {
    // console.log("in office origin design");

    const designations = await this.getOfficeOriginDesignation(officeId, token);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (designations && designations.length > 0) {
      for (const designation of designations) {
        const { sql, params } = buildUpsertSql("master.office_origin_designation", "id", {
          id: designation.id,
          nameEn: designation.name.en,
          nameBn: designation.name.bn,
          originUnitId: designation.origin_unit_id,
          originId: designation.origin_id,
        });

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ officeOriginDesignationCount: count });

    return count;
  }

  async syncOfficeUnit(officeId: number, token: any) {
    // console.log("in office unit");

    const units = await this.getOfficeUnit(officeId, token);
    const connection = await pgConnect.getConnection("master");
    let officeUnitCount = 0;
    let officeUnitEmployeeCount = 0;

    if (units && units.length > 0) {
      for (const unit of units) {
        const { sql, params } = buildUpsertSql(
          "master.office_unit",
          "id",
          {
            id: unit.id,
            nameEn: unit.name.en,
            nameBn: unit.name.bn,
            parentId: unit.parent.id || null,
            officeId: officeId || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          let res = await connection.query(sql, params);
          officeUnitCount = officeUnitCount + 1;
          let officeEmployee = await this.syncOfficeEmployee(unit.id, token);
          officeUnitEmployeeCount = officeUnitEmployeeCount + officeEmployee;
        } catch (error) {
          console.log(error);
        }
      }
    }

    return { officeUnitCount, officeUnitEmployeeCount };
  }

  async syncOfficeDesignation(officeId: number, token: any) {
    const designations = await this.getOfficeDesignation(officeId, token);
    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (designations && designations.length > 0) {
      for (const designation of designations) {
        const employees = await this.getOfficeEmployee(designation.unit.id, token);
        const employee = employees?.filter((value: any) => value.designation.id == designation.id) as any;
        console.log({ employees, employee });
        const { sql, params } = buildUpsertSql(
          "master.office_designation",
          "id",
          {
            id: designation.id,
            nameEn: designation.name.en || "",
            nameBn: designation.name.bn,
            officeId: designation.office.id,
            unitId: designation.unit.id,
            employeeId: employee[0]?.id || null,
            // isOfficeHead: designation.is_office_head,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ officeDesignationCount: count });

    return count;
  }

  async syncOfficeEmployee(officeUnitId: number, token: any) {
    const employees = await this.getOfficeEmployee(officeUnitId, token);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (employees && employees.length > 0) {
      for (const employee of employees) {
        const { sql, params } = buildUpsertSql(
          "master.office_employee",
          "id",
          {
            id: employee.id,
            nameEn: employee.name.en,
            nameBn: employee.name.bn,
            designationId: employee.designation.id || null,
            email: employee.email || null,
            mobile: employee.mobile || null,
            nid: employee.nid || null,
            dob: employee.dob || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log({ officeEmployeeCount: count });

    return count;
  }

  //office materialize view update
  async refreshOfficeMaterializedView() {
    const pool = pgConnect.getConnection("master");
    const officeMaterializeViewUpdateSql = `REFRESH MATERIALIZED VIEW  master.mv_level_wise_office`;
    const officeMaterializedViewRefreshStaus = await pool.query(officeMaterializeViewUpdateSql);

    return officeMaterializedViewRefreshStaus ? true : false;
  }
}
