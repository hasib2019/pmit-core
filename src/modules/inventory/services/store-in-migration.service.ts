import { Service } from "typedi";
import { BadRequestError, buildInsertSql, buildSql, buildUpdateSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { StoreInMigrationAttributes } from "../interfaces/store-in-migration.interface";
import lodash from "lodash";
import { Pool, PoolClient } from "pg";
import { Container } from "typedi";
import { ApplicationServices } from "../../application/services/application.service";
@Service()
export class StoreInMigrationService {
  constructor() {}

  async getItemForExcel() {
    const connection = db.getConnection("slave");
    const sql = `select c.group_name, a.category_name,b.item_name,b.is_asset, b.id as item_id, d.mou_name,e.id as asset_type_code,e.display_value as asset_type_name_bn 
    from inventory.item_category a
        inner join inventory.item_info b on a.id = b.category_id
      inner join inventory.item_group c on c.id = a.group_id 
        inner join inventory.measurement_unit d on d.id = b.mou_id 
      inner join master.code_master e on e.id =b.goods_type
      order by c.group_name , a.category_name`;

    try {
      const result = (await connection.query(sql)).rows;
      return result.length > 0 ? toCamelKeys(result) : [];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async leftPadding(number: any, length: any) {
    var finalLength = length - number.toString().length;
    return (finalLength > 0 ? new Array(++finalLength).join("0") : "") + number;
  }
  async approveStoreInMigration(
    itemData: any,
    userId: number,
    client: PoolClient,
    doptorId: number,
    designationId: number
  ) {
    const storeIdSql = `select id from inventory.store_info where admin_desk_id = $1`;
    const storeId = (await client.query(storeIdSql, [designationId])).rows[0]?.id;
    if (!storeId) {
      throw new BadRequestError(`আপনার অনুমোদন দেয়ার অনুমতি নেই`);
    }
    const storeAdminSql = `select admin_desk_id from inventory.store_info where id = $1`;
    const storeAdminDesignationId = (await client.query(storeAdminSql, [storeId])).rows[0].admin_desk_id;
    if (+storeAdminDesignationId !== +designationId) {
      throw new BadRequestError(`আপনার অনুমোদন দেয়ার অনুমতি নেই`);
    }
    const itemDataForFixedItem = lodash.cloneDeep(itemData.itemData);

    const getAllStoreItemSql = `select id, store_id, item_id, quantity from inventory.store_item`;
    const allStoreItem = (await client.query(getAllStoreItemSql)).rows;
    const storeItemMap: any = {};
    const storeItemIdMap: any = {};

    for (let i = 0; i < allStoreItem.length; i++) {
      const key = `${+allStoreItem[i].item_id}-${+allStoreItem[i].store_id}`;
      storeItemMap[key] = allStoreItem[i].quantity;
      storeItemIdMap[key] = allStoreItem[i].id;
    }

    for (let i = 0; i < itemData?.itemData?.length; i++) {
      const qunatity = storeItemMap[`${itemData.itemData[i].itemId}-${itemData.itemData[i].storeId}`];

      if (!storeItemMap[`${+itemData.itemData[i].itemId}-${+itemData.itemData[i].storeId}`]) {
        itemData.itemData[i].createdBy = userId;
        itemData.itemData[i].createdAt = new Date();
      } else {
        itemData.itemData[i].quantity = +itemData.itemData[i].quantity + (qunatity ? +qunatity : 0);
        itemData.itemData[i].isUpdate = true;
        itemData.itemData[i].id = storeItemIdMap[`${itemData.itemData[i].itemId}-${itemData.itemData[i].storeId}`];
        itemData.itemData[i].updatedBy = userId;
        itemData.itemData[i].updatedAt = new Date();
      }
    }
    try {
      const ids = [];
      let result;
      const itemStatusSql = `select id from master.code_master where return_value =$1`;
      const statusId = await (await client.query(itemStatusSql, ["USB"])).rows[0]?.id;
      if (!statusId) {
        throw new BadRequestError("মালামালের স্ট্যাটাস পাওয়া যায়নি");
      }

      for (let i = 0; i < itemData.itemData.length; i++) {
        userId;
        if (storeItemMap[`${+itemData.itemData[i].itemId}-${+itemData.itemData[i].storeId}`]) {
          try {
            const { sql, params } = buildUpdateSql(
              "inventory.store_item",
              itemData.itemData[i].id,
              lodash.omit(itemData.itemData[i], [
                "isUpdate",
                "id",
                "itemName",
                "unitName",
                "groupName",
                "storeName",
                "categoryName",
                "assetType",
                "isAsset",
              ]),
              "id"
            );

            result = (await client.query(sql, params)).rows[0].id;

            ids.push(result);
          } catch (error: any) {
            console.log("error", error);
            throw new BadRequestError(error);
          }
        } else {
          try {
            const { sql, params } = buildInsertSql(
              "inventory.store_item",
              lodash.omit(itemData.itemData[i], [
                "isUpdate",
                "itemName",
                "unitName",
                "groupName",
                "storeName",
                "categoryName",
                "assetType",
                "isAsset",
              ])
            );

            result = (await client.query(sql, params)).rows[0].id;

            ids.push(result);
          } catch (error: any) {
            console.log("error", error);
          }
        }
        //insert data in to fixed item table
        const { assetType, quantity, itemId, storeId, isAsset } = itemDataForFixedItem[i];

        if (isAsset) {
          //   throw new BadRequestError("stopstop");
          const fixedAssetInfoSql = `select max_sl,prefix,sl_number_length from inventory.doptor_item
          where item_id = $1 and doptor_id = $2`;
          const fixedAssetInfoData = (await client.query(fixedAssetInfoSql, [itemId, doptorId])).rows[0];

          const { max_sl, prefix, sl_number_length } = fixedAssetInfoData;
          let slNumber = max_sl === 0 ? 1 : max_sl;

          const assetCodeDate = new Date();
          const assetCodeYear = assetCodeDate.getFullYear();
          for (let i = 0; i < quantity; i++) {
            const prefixeSerialNumber = await this.leftPadding(slNumber, sl_number_length);

            const assetCode = prefix + "-" + assetCodeYear + "-" + prefixeSerialNumber;

            const { sql, params } = buildInsertSql("inventory.fixed_item", {
              itemId: itemId,
              assetCode: assetCode,
              status: +statusId,
              doptorId: doptorId,
              storeId: storeId,
              isUsed: false,
              createdBy: +userId,
              createdAt: new Date(),
            });

            const id = await (await client.query(sql, params)).rows[0].id;
            slNumber++;
          }

          const updateMaxSlSql = `update inventory.doptor_item set max_sl=$1 where item_id=$2 and doptor_id=$3`;
          const updateResult = await (await client.query(updateMaxSlSql, [slNumber, itemId, doptorId])).rows[0]?.id;
        }
      }

      return ids;
    } catch (error: any) {
      console.log("error", error);
    }
  }
  async getStoreInMigrationItemDetails(id: number, type: any, pool: Pool) {
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
}
