/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-11 09:52:37
 * @modify date 2022-08-11 09:52:37
 * @desc [description]
 */

import axios from "axios";
import Container, { Service } from "typedi";
import { dashboardUrl, getDashboardClientCreds } from "../../../configs/app.config";
import { IRoleAttrs } from "../../../modules/role/interfaces/role.interface";
import RoleService from "../../../modules/role/services/role.service";
import { ComponentType } from "./../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";

@Service()
export class RoleSyncService extends Dashboard {
  constructor(component: ComponentType = "coop") {
    super(component);
  }

  //sync roles in dashboard. roles will be deleted which are not in component
  async syncRoles(doptorId: number) {
    const roleService = Container.get(RoleService);
    const roles = await roleService.getAll(this.componentId, doptorId);
    console.log({ roles });

    const data = await this.syncDashboardRole(roles);

    return data
      ? `${numberToWord(data.length)} টি রোল ড্যাসবোর্ডে প্রেরণ করা হয়েছে`
      : `রোল ড্যাসবোর্ডে প্রেরণে ত্রুটি হয়েছে`;
  }

  // //create role in dashboard
  // async createRoles(doptorId?: number) {
  //   const roleService = Container.get(RoleService);
  //   const roles = await roleService.getAll(this.componentId);

  //   const data = await this.createDashboardRole(roles);

  //   return data ? `${data.length} roles created` : `cannot create role`;
  // }

  // async createDashboardRole(roles: IRoleAttrs[]) {
  //   const rolesToSync = this.createRolePayload(roles);

  //   try {
  //     const res = await axios.post(
  //       `${dashboardUrl}/api/v1/roles`,
  //       {
  //         roles: rolesToSync,
  //       },
  //       await this.getConfig()
  //     );
  //     return res.data.data as Array<Object>;
  //   } catch (error: any) {
  //     this.throwError(error);
  //   }
  // }

  async syncDashboardRole(roles: IRoleAttrs[]) {
    const rolesToSync = this.createRolePayload(roles);
    // console.log({ rolesToSync });

    try {
      const res = await axios.post(
        `${dashboardUrl}/api/v1/roles/sync`,
        {
          roles: rolesToSync,
        },
        await this.getConfig()
      );
      return res.data as Array<Object>;
    } catch (error: any) {
      await this.syncLogService.storeLog(
        "process_token_generate",
        error.config.url as string,
        error.config.data,
        undefined,
        error?.response?.statusText
          ? JSON.stringify({ error_message: error.response.statusText })
          : JSON.stringify(error),
        error?.response?.status ? error.response.status : 500,
        false
      );
      this.throwError(error);
    }
  }

  createRolePayload(roles: IRoleAttrs[]) {
    return roles.map((role) => {
      return {
        module_role_id: role.id,
        name: role.roleName,
        doptor_id: role.doptorId,
        module_id: getDashboardClientCreds(this.component).dashboardClientId,
      };
    });
  }
}
