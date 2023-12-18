import Container, { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { Pool, PoolClient } from "pg";
import { ItemDtlInfoAttr } from "../interfaces/itemDtlInfoAttr.interface";
import { ItemMstInfoAttr } from "../interfaces/itemMstInfo.interface";
import { brotliDecompress } from "zlib";
import { ApplicationServices } from "../../application/services/application.service";

@Service()
export class ItemRequisitionService {
  async getRequisitionPurpose(doptorId: number) {
    const connection = db.getConnection("slave");
    try {
      const sql = `select id, purpose_name from inventory.requisition_purpose where doptor_id =$1`;
      const result = (await connection.query(sql, [doptorId])).rows;
      return toCamelKeys(result);
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getRequisitionDetailsOfInventoryItem(id: number, type: any, pool: Pool) {
    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    const sql = `select service_id, next_app_designation_id,status,data from temps.application where id = $1`;
    const result = (await pool.query(sql, [id])).rows[0];
    const finalResult = {
      type: type,
      ...result,
      history: await applicationService.getAppHistory(id, pool),
    };
    return toCamelKeys(finalResult);
  }
  checkIfItemExistInTheStoreOrNot(storeItems: any, itemId: number) {
    const isExist = storeItems.some((storeItem: any) => +storeItem.item_id === +itemId);
    return isExist;
  }
  checkIfSufficientAmountExistInTheStoreOrNot(storeItems: any, itemId: number, quantity: number) {
    const itemDetailInfo = storeItems.find((storeItem: any) => +storeItem.item_id === +itemId);

    if (itemDetailInfo?.quantity >= quantity) {
      return {
        status: true,
        quantity: itemDetailInfo?.quantity,
      };
    } else {
      return {
        status: false,
        quantity: null,
      };
    }
  }
  async getItemNameBn(itemId: number, pool: PoolClient) {
    const itemNameBnSql = `select item_name from inventory.item_info where id = $1`;
    const itemNameBn = (await pool.query(itemNameBnSql, [itemId])).rows[0].item_name;
    return itemNameBn;
  }
  async approveItemRequisition(
    pool: PoolClient,
    itemDtlInfo: ItemDtlInfoAttr,
    itemMstInfo: ItemMstInfoAttr,
    designationId: number,
    applicationId: number,
    employeeId: number,
    userId: number,
    officeId: number,
    doptorId: number
  ) {
    const applicantIdSql = `select created_by from temps.application where id =$1`;
    const applicantId = (await pool.query(applicantIdSql, [applicationId])).rows[0]?.created_by;
    if (!applicantId) {
      throw new BadRequestError("আবেদনকারী খুঁজে পাওয়া যাইনি");
    }
    const applicantEmployeeIdSql = `select employee_id from users.user where id =$1`;

    const applicantEmployeeId = (await pool.query(applicantEmployeeIdSql, [applicantId])).rows[0]?.employee_id;

    const itemDtlInfoNew = itemDtlInfo?.map((dtl: any) => {
      return {
        itemId: dtl?.itemId?.id,
        approvedQuantity: dtl?.approvedQuantity,
        reqQuantity: dtl?.requestedQuantity,
        deliveryQuantity: dtl?.deliveredQuantity,
        requisitionUrgency: dtl?.requisitionUrgency?.id,
      };
    });

    // throw new BadRequestError("Stop Here ");

    const storeIdSql = `select id from inventory.store_info where admin_desk_id = $1`;
    const storeId = (await pool.query(storeIdSql, [designationId])).rows[0]?.id;
    if (!storeId) {
      throw new BadRequestError(`আপনার অনুমোদন দেয়ার অনুমতি নেই`);
    }
    const storeAdminSql = `select admin_desk_id from inventory.store_info where id = $1`;
    const storeAdminDesignationId = (await pool.query(storeAdminSql, [storeId])).rows[0].admin_desk_id;
    const requestedBySql = `select max(designation_id) from temps.application_approval where application_id =$1`;
    const requestedById = (await pool.query(requestedBySql, [applicationId])).rows[0].max;

    if (+storeAdminDesignationId !== +designationId) {
      throw new BadRequestError(`আপনার অনুমোদন দেয়ার অনুমতি নেই`);
    }
    const storeItemSql = `select store_id, item_id, quantity from inventory.store_item where store_id = $1`;
    const storeItems = (await pool.query(storeItemSql, [storeId])).rows;
    if (!storeItems || storeItems?.length == 0) {
      throw new BadRequestError(`এই গুদামে কোনো পণ্য নেই`);
    }
    let itemMstInfoQueryResultId;

    const { sql, params } = buildInsertSql("inventory.item_delivery_mst", {
      ...itemMstInfo,
      applicationId: applicationId,
      employeeId: applicantEmployeeId,
      deliveryDate: new Date(),
      requestedBy: +requestedById,
      officeId: officeId,
    });
    itemMstInfoQueryResultId = (await pool.query(sql, params)).rows[0].id;

    const itemDtlInfoIds = [];
    const itemIds: any = [];
    let fixedItemObj: any = {};
    if (Array.isArray(itemDtlInfoNew) && itemDtlInfoNew?.length > 0) {
      for (let item of itemDtlInfoNew) {
        itemIds.push(item.itemId);
      }
    }

    //fetch goods type of all item
    let goodsTypeObj: any = {};
    if (itemIds.length > 0) {
      const placeholders = itemIds.map((_: any, index: any) => `$${index + 1}`).join(", ");

      const goodsTypeSql = `select is_asset,id from inventory.item_info where id in (${placeholders})`;
      const fixedItemPrimaryKeySql = `select id,item_id from inventory.fixed_item
      where item_id in (${placeholders}) AND doptor_id = $${itemIds.length + 1}
      AND store_id = $${itemIds.length + 2}
      AND is_used = false`;
      const goodsTypes = await (await pool.query(goodsTypeSql, itemIds.flat())).rows;
      const fixedItemPKeys = await (
        await pool.query(fixedItemPrimaryKeySql, [...itemIds.flat(), doptorId, storeId])
      ).rows;
      fixedItemObj = fixedItemPKeys.reduce((obj, item) => {
        const { id, item_id } = item;
        if (!obj[item_id]) {
          obj[item_id] = [];
        }
        obj[item_id].push(id);
        return obj;
      }, {});

      // throw new BadRequestError("Stoppp");
      for (let type of goodsTypes) {
        goodsTypeObj[type.id] = type.is_asset;
      }
    }

    if (Array.isArray(itemDtlInfoNew) && itemDtlInfoNew?.length > 0) {
      const fixedItemIdsWhichNeedsToUpdate: any = [];
      for (let item of itemDtlInfoNew) {
        //validate is delivary quantity is greater than approved quantity

        if (!item?.approvedQuantity) {
          if (item?.approvedQuantity !== 0) {
            throw new BadRequestError("অনুমোদন ব্যতিত মালামাল প্রদান করা যাবে না");
          }
        }
        if (item?.deliveryQuantity > item?.approvedQuantity) {
          throw new BadRequestError("অনুমোদিত সংখ্যার ছেয়ে বেশি মালামাল প্রদান করা যাবেনা");
        }

        const isItemExistInStore = this.checkIfItemExistInTheStoreOrNot(storeItems, item.itemId);
        const hasEnoughQuantity = this.checkIfSufficientAmountExistInTheStoreOrNot(
          storeItems,
          item.itemId,
          item.deliveryQuantity
        );
        if (!isItemExistInStore) {
          throw new BadRequestError(`${await this.getItemNameBn(item.itemId, pool)} স্টোরে এ বিদ্যমান নেই`);
        }
        if (!hasEnoughQuantity.status) {
          throw new BadRequestError(`পর্যাপ্ত পরিমান ${await this.getItemNameBn(item.itemId, pool)}  স্টোরে মজুত নেই`);
        }

        const { sql, params } = buildInsertSql("inventory.item_delivery_dtl", {
          ...item,
          deliveryMstId: itemMstInfoQueryResultId,
        });
        const itemDltInfoQueryResultId = (await pool.query(sql, params)).rows[0].id;
        itemDtlInfoIds.push(itemDltInfoQueryResultId);
        const updateStoreItemQuantitySql = `update inventory.store_item set quantity = $1 where store_id = $2 and item_id = $3`;
        pool.query(updateStoreItemQuantitySql, [
          hasEnoughQuantity?.quantity - item.deliveryQuantity,
          storeId,
          item.itemId,
        ]);

        //Insert data into fixed Asset use info
        if (goodsTypeObj[item.itemId]) {
          for (let i = 0; i < item.deliveryQuantity; i++) {
            const { sql, params } = buildInsertSql("inventory.fixed_asset_use_info", {
              itemId: item.itemId,
              employeeId: applicantEmployeeId,
              receiveDate: new Date(),
              returnDate: null,
              fixed_item_id: fixedItemObj[item.itemId][i],
            });
            await pool.query(sql, params);
            fixedItemIdsWhichNeedsToUpdate.push(fixedItemObj[item.itemId][i]);
            fixedItemObj[item.itemId].splice(i, 1);
          }
        }
      }
      if (fixedItemIdsWhichNeedsToUpdate?.length > 0) {
        const placeholders = fixedItemIdsWhichNeedsToUpdate.map((_: any, index: any) => `$${index + 1}`).join(", ");
        const updateFixedItemSql = `update inventory.fixed_item set is_used = true where id in (${placeholders})`;
        await pool.query(updateFixedItemSql, fixedItemIdsWhichNeedsToUpdate.flat());
      }
    }
    // throw new BadRequestError("stopstopstop");
    return {
      itemDtlInfoIds: itemDtlInfoIds,
      itemMstInfoId: itemMstInfoQueryResultId,
    };
  }
  async isStoreAdmin(designationId: number) {
    let isStoreAdmin = false;
    const pool = await db.getConnection("slave");
    const storeIdSql = `select id from inventory.store_info where admin_desk_id = $1`;
    const storeId = (await pool.query(storeIdSql, [designationId])).rows[0]?.id;
    if (!storeId) {
      isStoreAdmin = false;
    }
    const storeAdminSql = `select admin_desk_id from inventory.store_info where id = $1`;
    const storeAdminDesignationId = (await pool.query(storeAdminSql, [storeId])).rows[0]?.admin_desk_id;
    if (+storeAdminDesignationId !== +designationId) {
      isStoreAdmin = false;
    } else {
      isStoreAdmin = true;
    }
    return isStoreAdmin;
  }
  async getStoreAdminInfo(officeId: number) {
    const pool = await db.getConnection("slave");
    const storeAdminInfoSql = `select admin_desk_id from inventory.store_info where office_id = $1`;
    const storeAdminDesignationId = (await pool.query(storeAdminInfoSql, [officeId])).rows[0]?.admin_desk_id;
    return storeAdminDesignationId;
  }
}
