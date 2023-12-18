import { toCamelKeys, toSnakeCase } from "keys-transform";
import lodash from "lodash";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import { ApplicationServices } from "../../../modules/application/services/application.service";
import { IPaginationResponse } from "../../../types/interfaces/pagination.interface";
import { emptyPaginationResponse, getPaginationDetails } from "../../../utils/pagination.util";
import {
  buildInsertSql,
  buildUpdateWithWhereSql,
  buildWhereAggrSql,
  buildWhereSql,
} from "../../../utils/sql-builder.util";
import { IProjectAttrs } from "../interfaces/project.interface";

@Service()
export default class ProjectService {
  constructor() {}

  // get project with pagination
  async get(page: number, limit: number, doptorId: number, filter: IProjectAttrs): Promise<IPaginationResponse> {
    const pool = db.getConnection();
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM master.project_info",
        { ...filter, doptorId: doptorId },
        this.injectionFilter
      );

      const totalCount = await (await pool.query(countSql, countParams)).rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        `SELECT 
          id, 
          project_name, 
          project_name_bangla, 
          project_code, 
          project_director, 
          doptor_id, 
          project_duration,
          CAST(FLOOR(estimated_exp) as numeric) estimated_exp,
          fund_source, 
          project_phase, 
          description, 
          is_active, 
          samity_type, 
          CAST(FLOOR(admission_fee) as integer) admission_fee, 
          admission_gl_id, 
          CAST(FLOOR(passbook_fee) as integer) passbook_fee, 
          passbook_gl_id, 
          is_default_savings_product,
          is_default_share_product, 
          initiate_date, 
          expire_date 
        FROM 
          master.project_info`,
        { ...filter, doptorId: doptorId },
        pagination.skip,
        pagination.limit,
        this.injectionFilter
      );
      const result = await pool.query(sql, params);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    } else {
      const countRes = await pool.query("SELECT COUNT(*) AS total FROM master.project_info WHERE doptor_id = $1", [
        doptorId,
      ]);
      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      const sql = `SELECT 
                    id, 
                    project_name, 
                    project_name_bangla, 
                    project_code, 
                    project_director, 
                    doptor_id, 
                    project_duration, 
                    CAST(FLOOR(estimated_exp) as numeric) estimated_exp,
                    fund_source, 
                    project_phase, 
                    description, 
                    is_active, 
                    samity_type, 
                    CAST(FLOOR(admission_fee) as integer) admission_fee,
                    admission_gl_id, 
                    CAST(FLOOR(passbook_fee) as integer) passbook_fee, 
                    passbook_gl_id,
                    is_default_savings_product, 
                    initiate_date, 
                    expire_date 
                  FROM 
                    master.project_info 
                  WHERE 
                    doptor_id = $1 
                  ORDER BY 
                    id ASC
                  LIMIT $2 
                  OFFSET $3`;
      const result = await pool.query(sql, [doptorId, pagination.limit, pagination.skip]);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    }
  }
  // create project
  async create(data: IProjectAttrs): Promise<IProjectAttrs> {
    const client = await db.getConnection("master").connect();
    try {
      client.query("BEGIN");
      let admissionGlId =
        data.admissionGlId && (data.admissionGlId as any) != "নির্বাচন করুন" ? data.admissionGlId : null;
      let passbookGlId = data.passbookGlId && (data.passbookGlId as any) != "নির্বাচন করুন" ? data.passbookGlId : null;
      const { sql, params } = buildInsertSql(
        "master.project_info",
        {
          ...lodash.omit(data, ["admissionGlId", "passbookGlId"]),
          // samityType: JSON.stringify(data.samityType),
          admissionGlId,
          passbookGlId,
        }
        //lo.omit(data, ["zone"])
      );

      let result = (await client.query(sql, params)).rows[0];
      if (result) result = toCamelKeys(result) as IProjectAttrs;

      if (data.isDefaultSavingsProduct) {
        const savingsProductGlIdSql = `SELECT
                                        id
                                      FROM
                                        loan.glac_mst
                                      WHERE
                                        doptor_id = $1 AND
                                        is_savings_product_gl = true`;
        const savingsProductGlId = (await client.query(savingsProductGlIdSql, [data.doptorId])).rows;
        if (!savingsProductGlId[0])
          throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে ডিফল্ট সেভিংস প্রোডাক্টের জিএল পাওয়া যায়নি`);
        else if (savingsProductGlId.length > 1)
          throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক ডিফল্ট সেভিংস প্রোডাক্টের জিএল পাওয়া গেছে`);
        else {
          const { sql: savingsProductSql, params: savingsProductParams } = buildInsertSql("loan.product_mst", {
            doptorId: data.doptorId,
            projectId: result.id,
            openDate: new Date(),
            productName: `${result.projectNameBangla} সেভিংস`,
            productType: "L",
            depositNature: "R",
            productGl: savingsProductGlId[0]?.id,
            defaultAmt: 0,
            isActive: true,
            productCode: "R01",
            isDefaultSavings: true,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
          });
          const savingsProduct = (await client.query(savingsProductSql, savingsProductParams)).rows[0];
        }
      }
      if (data.isDefaultShareProduct) {
        const shareProductGlIdSql = `SELECT
                                        id
                                      FROM
                                        loan.glac_mst
                                      WHERE
                                        doptor_id = $1 AND
                                        is_share_product_gl = true`;
        const shareProductGlId = (await client.query(shareProductGlIdSql, [data.doptorId])).rows;
        if (!shareProductGlId[0])
          throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে ডিফল্ট শেয়ার প্রোডাক্টের জিএল পাওয়া যায়নি`);
        else if (shareProductGlId.length > 1)
          throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক ডিফল্ট শেয়ার প্রোডাক্টের জিএল পাওয়া গেছে`);
        else {
          const { sql: shareProductSql, params: shareProductParams } = buildInsertSql("loan.product_mst", {
            doptorId: data.doptorId,
            projectId: result.id,
            openDate: new Date(),
            productName: `${result.projectNameBangla} শেয়ার`,
            productType: "L",
            depositNature: "S",
            productGl: shareProductGlId[0]?.id,
            defaultAmt: 0,
            isActive: true,
            productCode: "S01",
            isDefaultShare: true,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
          });
          const shareProduct = (await client.query(shareProductSql, shareProductParams)).rows[0];
        }
      }
      client.query("COMMIT");
      return result ? (toCamelKeys(result) as any) : {};
    } catch (e) {
      client.query("ROLLBACK");
      throw new BadRequestError(String(e));
    } finally {
      client.release();
    }
  }
  // update project by id
  async update(conditions: IProjectAttrs, updates: IProjectAttrs): Promise<IProjectAttrs> {
    const pool = db.getConnection("master");

    const { sql, params } = buildUpdateWithWhereSql("master.project_info", conditions, lodash.omit(updates, ["zone"]));
    const result = await pool.query(sql, params);

    return result.rows[0] ? (toCamelKeys(result.rows[0]) as any) : {};
  }

  async getAllUpazilaWithDistDiv(divisionId: any, districtId?: any, upazilaId?: any): Promise<any> {
    const pool = db.getConnection();

    if (districtId && !upazilaId) {
      var sql = `SELECT district_id, upazila_info.id FROM master.upazila_info 
                        WHERE division_id = $1 and district_id = $2`;
      var upazilaInfo = await await pool.query(sql, [divisionId, districtId]);
    } else if (districtId && upazilaId) {
      sql = `SELECT district_id, upazila_info.id FROM master.upazila_info 
                    WHERE division_id = $1 and district_id = $2 and id = $3`;
      upazilaInfo = await await pool.query(sql, [divisionId, districtId, upazilaId]);
    } else {
      sql = `SELECT district_id, upazila_info.id FROM master.upazila_info 
                    WHERE division_id = $1`;
      upazilaInfo = await await pool.query(sql, [divisionId]);
    }

    return toCamelKeys(upazilaInfo.rows);
  }

  async getProjectWithoutPagination(projects: number[]) {
    const pool = db.getConnection("slave");
    var sql = `SELECT id, project_name, project_name_bangla, is_default_savings_product, is_default_share_product FROM master.project_info 
                        WHERE id = ANY($1::int[])`;
    // if (!projects[0])
    //   throw new BadRequestError(
    //     `ব্যবহারকারীর অনুমোদিত কোন প্রকল্পও পাওয়া যায়নি`
    //   );
    const allProjects = (await pool.query(sql, [projects])).rows;
    for (let [index, singleProject] of allProjects.entries()) {
      if (singleProject.is_default_savings_product || singleProject.is_default_share_product) {
        allProjects[index] = { ...allProjects[index], nomineeStatus: true };
      } else {
        allProjects[index] = { ...allProjects[index], nomineeStatus: false };
      }
    }
    return allProjects[0] ? toCamelKeys(allProjects) : [];
  }

  async getProjectByOffice(doptorId: number, userId?: number | null) {
    const pool = db.getConnection("slave");
    if (!userId) {
      let sql = `SELECT id, project_name, project_name_bangla,project_code FROM master.project_info 
      WHERE doptor_id = $1 ORDER BY id ASC`;
      let projectInfo = (await pool.query(sql, [doptorId])).rows;
      return projectInfo[0] ? toCamelKeys(projectInfo) : [];
    } else {
      let sql = `SELECT id, project_name, project_name_bangla FROM master.project_info 
                        WHERE doptor_id = $1 ORDER BY id ASC`;
      let projectInfo = (await pool.query(sql, [doptorId])).rows;

      let assignedProjectsSql = `SELECT project_id FROM master.user_wise_project 
                                  WHERE doptor_id = $1 AND user_id = $2 AND is_active=true ORDER BY project_id ASC`;
      let assignedProjects = (await pool.query(assignedProjectsSql, [doptorId, userId])).rows;
      assignedProjects = assignedProjects.map((value: any) => value.project_id);
      Array.isArray(projectInfo) && projectInfo[0]
        ? projectInfo.map((value: any, index: number) => {
            if (assignedProjects.includes(value.id)) {
              projectInfo[index] = {
                ...projectInfo[index],
                assignStatus: true,
              };
            } else {
              projectInfo[index] = {
                ...projectInfo[index],
                assignStatus: false,
              };
            }
          })
        : "";

      return projectInfo[0] ? toCamelKeys(projectInfo) : [];
    }
  }

  async getZoneByProject(projectId: number): Promise<any> {
    const pool = db.getConnection("slave");
    const sql = `SELECT a.id, b.division_name, b.division_name_bangla, 
                        c.district_name, c.district_name_bangla, 
                        d.upazila_name, d.upazila_name_bangla, is_active 
                    FROM master.project_zone a, 
                        master.division_info b,
                        master.district_info c,
                        master.upazila_info d 
                    WHERE a.division_id = b.id AND 
                        a.district_id = c.id AND 
                        a.upazila_id = d.id AND 
                        project_id = $1`;
    const zoneInfo = await await pool.query(sql, [projectId]);
    return toCamelKeys(zoneInfo.rows);
  }

  async getUserWiseProject(doptorId: number, userId: number): Promise<any> {
    const pool = db.getConnection("slave");
    var sql = `SELECT project_id FROM master.user_wise_project 
                    WHERE doptor_id = $1 AND user_id = $2 AND is_active = true`;
    var userWiseProjects = await await pool.query(sql, [doptorId, userId]);

    return toCamelKeys(userWiseProjects.rows);
  }

  async getUserByDoptor(doptorId: number, officeId: number): Promise<any> {
    const pool = db.getConnection("slave");
    var sql;
    var userInfo: object[] = [];
    if (doptorId > 0 && officeId <= 0) {
      sql = `select
              a.id,
              a.username,
              d.name_bn designation_bn,
              c.name_bn
            from
              users.user a
              inner join master.office_info b on
                a.office_id = b.id
              inner join master.office_employee c on
                c.id = a.employee_id
              inner join master.office_designation d on
                d.id = a.designation_id
            where
              b.doptor_id = $1`;
      userInfo = (await pool.query(sql, [doptorId])).rows;
    } else if (doptorId <= 0 && officeId > 0) {
      sql = `select 
              a.id, 
              a.username, 
              d.name_bn designation_bn,
              c.name_bn 
            from 
              users."user" a 
              inner join master.office_info b on a.office_id = b.id 
              inner join master.office_employee c on c.id = a.employee_id 
              inner join master.office_designation d on d.id = a.designation_id
            where 
              a.office_id = $1`;
      userInfo = (await pool.query(sql, [officeId])).rows;
    } else {
      sql = `select 
              a.id, 
              a.username, 
              d.name_bn designation_bn,
              c.name_bn 
            from 
              users.user a 
              inner join master.office_info b on a.office_id = b.id 
              inner join master.office_employee c on c.id = a.employee_id 
              inner join master.office_designation d on d.id = a.designation_id
            where 
              b.doptor_id = $1
              and a.office_id = $2`;
      userInfo = (await pool.query(sql, [doptorId, officeId])).rows;
    }

    return userInfo[0] ? toCamelKeys(userInfo) : [];
  }

  // createUserWiseProject
  async createUserWiseProject(doptorId: number, data: any, transaction: PoolClient) {
    const camelCaseData = data ? toCamelKeys(data) : data;
    let resProjectsAssign: any[] = [];
    const previousProjectAssignCheckSql = `SELECT
                                            id
                                          FROM 
                                            master.user_wise_project
                                          WHERE
                                            doptor_id = $1
                                            AND user_id = $2
                                            AND project_id = $3`;
    let result;
    for (const value of camelCaseData.projects) {
      if (value.isChecked == true && value.assignStatus == false) {
        let previousProjectAssignCheck = (
          await transaction.query(previousProjectAssignCheckSql, [doptorId, camelCaseData.assignUser, value.id])
        ).rows[0];

        if (previousProjectAssignCheck?.id) {
          const { sql, params } = buildUpdateWithWhereSql(
            "master.user_wise_project",
            {
              id: previousProjectAssignCheck.id,
            },
            {
              userId: camelCaseData.assignUser,
              projectId: value.id,
              doptorId,
              createdBy: camelCaseData.userId,
              isActive: true,
            }
          );
          result = (await transaction.query(sql, params)).rows[0];
        } else {
          const { sql, params } = buildInsertSql("master.user_wise_project", {
            userId: camelCaseData.assignUser,
            projectId: value.id,
            doptorId,
            createdBy: camelCaseData.userId,
          });

          result = (await transaction.query(sql, params)).rows[0];
        }

        resProjectsAssign.push(result);
      } else if (value.isChecked == false && value.assignStatus == true) {
        let previousProjectAssignCheck = (
          await transaction.query(previousProjectAssignCheckSql, [doptorId, camelCaseData.assignUser, value.id])
        ).rows[0];
        if (previousProjectAssignCheck.id) {
          let { sql: previousProjectAssignDeactiveSql, params: previousProjectAssignDeactiveParams } =
            buildUpdateWithWhereSql(
              "master.user_wise_project",
              {
                id: previousProjectAssignCheck.id,
              },
              {
                isActive: false,
              }
            );
          result = (await transaction.query(previousProjectAssignDeactiveSql, previousProjectAssignDeactiveParams))
            .rows[0];
          resProjectsAssign.push(result);
        }
      }
    }
    return resProjectsAssign.length > 0 ? toCamelKeys(resProjectsAssign) : [];
  }

  async getUserWiseProjectDetails(appId: number, type: string, componentId: number, pool: Pool): Promise<any> {
    var sql = `SELECT
                b.employee_id,
                c.name_bn,
                b.username,
                d.name_bn designation_bn,
                a.service_id, 
                a.data, 
                a.created_by
              FROM
                temps.application a
                INNER JOIN users.user b ON CAST(a.data -> 'assign_user' as varchar) = CAST(b.id as varchar)
                INNER JOIN master.office_designation d ON d.id = b.designation_id
                INNER JOIN master.office_employee c ON b.employee_id = c.id
              WHERE
                a.id = $1 and a.component_id = $2`;
    let appData = (await pool.query(sql, [appId, componentId])).rows[0];
    if (!appData) throw new BadRequestError(`Application details not found`);
    appData = appData ? toCamelKeys(appData) : appData;
    let assignProjectsDetailsInfo = [];
    const projectNameSql = `SELECT project_director FROM master.project_info WHERE id = $1`;

    for (let [index, singleProject] of appData.data.projects.entries()) {
      if (singleProject.assignStatus.toString() != singleProject.isChecked.toString()) {
        if (singleProject.assignStatus.toString() == "true" && singleProject.isChecked.toString() == "false") {
          let projectInfo = (await pool.query(projectNameSql, [singleProject.id])).rows[0];
          projectInfo = projectInfo ? toCamelKeys(projectInfo) : projectInfo;
          assignProjectsDetailsInfo.push({ ...singleProject, ...projectInfo, changeStatus: "R" });
        } else if (singleProject.assignStatus.toString() == "false" && singleProject.isChecked.toString() == "true") {
          let projectInfo = (await pool.query(projectNameSql, [singleProject.id])).rows[0];
          projectInfo = projectInfo ? toCamelKeys(projectInfo) : projectInfo;
          assignProjectsDetailsInfo.push({ ...singleProject, ...projectInfo, changeStatus: "N" });
        }
      }
    }
    const applicationServices: ApplicationServices = Container.get(ApplicationServices);
    const details = {
      type: type,
      applicationInfo: {
        ...lodash.omit(appData, ["data"]),
        assignProjectsDetailsInfo,
      },
      history: await applicationServices.getAppHistory(appId, pool),
    };
    return details ? toCamelKeys(details) : [];
  }
  async getPermitProjectIds(deskId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  project_id 
                FROM 
                  master.user_wise_project a 
                  INNER JOIN users.user b ON b.id = a.user_id 
                WHERE 
                  b.designation_id = $1 AND
                  a.is_active = true`;
    const result = (await pool.query(sql, [deskId])).rows;
    const projectIds = result.length > 0 ? result.map((v: any) => v.project_id) : [];
    return projectIds;
  }
  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
