import { toCamelCase, toCamelKeys } from "keys-transform";
import { Pool, PoolClient } from "pg";
import { minioPresignedGet } from "../../../utils/minio.util";
import Container, { Service } from "typedi";
import { BadRequestError, buildInsertSql } from "rdcd-common";
import { ApplicationServices } from "../../application/services/application.service";

@Service()
export class PurchaseOrderService {
  constructor() {}

  async getSinglePurchaseOrderDetails(id: number, type: any, pool: Pool) {
    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    const sql = `select service_id, next_app_designation_id, status, data from temps.application where id = $1`;
    const result = (await pool.query(sql, [id])).rows[0];
    let finalResult = {
      type: type,
      ...result,
      history: await applicationService.getAppHistory(id, pool),
    };

    finalResult = await minioPresignedGet(finalResult, [
      "data.document_list.[].document_front",
      "data.document_list.[].document_back",
    ]);
    return toCamelKeys(finalResult);
  }
  async updatePurchaseOrderApplication(data: any, transaction: PoolClient, serviceActionId: number) {
    if (data?.payload) {
      const applicationGetSql = `select data from temps.application where id = $1`;
      const applicationInfo = (await transaction.query(applicationGetSql, [data?.applicationId])).rows[0].data;

      const payload = JSON.parse(data.payload);
      for (let item of payload.itemsTobePurchased) {
        if (!item?.approvedQuantity && serviceActionId === 3) {
          throw new BadRequestError(`${item?.itemId?.itemName} এর অনুমোদিত পরিমাণ প্রদান করুন`);
        } else if (!item?.receivedQuantity && (serviceActionId === 4 || serviceActionId === 5)) {
          throw new BadRequestError(`${item?.itemId?.itemName} এর গৃহীত পরিমাণ প্রদান করুন`);
        }
      }
      const payloadForUpdate = {
        ...applicationInfo,
        items_tobe_purchased: payload.itemsTobePurchased,
      };

      // throw new BadRequestError("stop here");
      const updateDataQuery = `update temps.application set data = $1 where id = $2`;
      const updateDataParams = [payloadForUpdate, Number(data.applicationId)];

      let updateApplicationDataResult;

      updateApplicationDataResult = await transaction.query(updateDataQuery, updateDataParams);
    }
  }
  async leftPadding(number: any, length: any) {
    var finalLength = length - number.toString().length;
    return (finalLength > 0 ? new Array(++finalLength).join("0") : "") + number;
  }
  async receivePurchasedItem(
    data: any,
    transaction: PoolClient,
    userId: Number,
    serviceActionId: number,
    designationId: number,
    doptorId: number
    // serviceAction: any
  ) {
    //update application

    if (data?.payload) {
      await this.updatePurchaseOrderApplication(data, transaction, serviceActionId);

      // const applicationGetSql = `select data from temps.application where id = $1`;
      // const applicationInfo = (await transaction.query(applicationGetSql, [data?.applicationId])).rows[0].data;
      // console.log({ applicationInfo });
      const payload = JSON.parse(data.payload);

      // if (!payload.hasOwnProperty("willReceivedPurchasedProductAgain")) {
      //   throw new BadRequestError(`আবার গ্রহণ করবেন কিনা নির্বাচন করুন`);
      // }
      // const payloadForUpdate = {
      //   ...applicationInfo,
      //   items_tobe_purchased: payload.itemsTobePurchased,
      // };
      // console.log({ payload });
      // // throw new BadRequestError("stop here");
      // const updateDataQuery = `update temps.application set data = $1 where id = $2`;
      // const updateDataParams = [payloadForUpdate, Number(data.applicationId)];

      // let updateApplicationDataResult;
      // try {
      //   updateApplicationDataResult = await transaction.query(updateDataQuery, updateDataParams);
      // } catch (error: any) {
      //   throw new BadRequestError(error);
      // }
      const isPurchaseInfoExistSql = `select id,application_id, receive_count from inventory.purchase_info_mst where application_id = $1`;
      const purchaseMstId = (await transaction.query(isPurchaseInfoExistSql, [+data?.applicationId])).rows[0];

      if (purchaseMstId?.application_id) {
        //udate existion purchase info mst and dtl
        const updateReceiveCountSql = `update inventory.purchase_info_mst set receive_count=$1, will_received_again=$2 where application_id = $3`;

        const updateReceiveCountResult = await transaction.query(updateReceiveCountSql, [
          +purchaseMstId?.receive_count + 1,
          +serviceActionId === 4 ? true : false,
          +purchaseMstId?.application_id,
        ]);
        const itemsTobeUpdatedSql = `select id , item_id ,received_quantity from inventory.purchase_info_dtl where purchase_mst_id=$1`;
        const itemsTobeUpdated = (await transaction.query(itemsTobeUpdatedSql, [+purchaseMstId?.id])).rows;
        let itemsTobeUpdatedObj: any = {};
        for (let item of itemsTobeUpdated) {
          // if (!item?.item_id) {
          itemsTobeUpdatedObj[`${+item?.item_id}`] = [item?.id, item?.received_quantity];
          // }
        }

        // throw new BadRequestError("stop");
        for (let item of payload?.itemsTobePurchased) {
          const updatePurchaseDtlSql = `update inventory.purchase_info_dtl set received_quantity=$1 where id=$2`;

          await transaction.query(updatePurchaseDtlSql, [
            +item?.receivedQuantity + itemsTobeUpdatedObj[item?.itemId?.id][1],
            itemsTobeUpdatedObj[item?.itemId?.id][0],
          ]);
        }
      } else {
        //insert purchase info mst and dtl
        const { sql: purchaseMstSql, params: purchaseMstParams } = buildInsertSql("inventory.purchase_info_mst", {
          application_id: +data?.applicationId,
          title: payload?.purchaseDetailInfo?.title,
          order_number: payload?.purchaseDetailInfo?.orderNumber,
          order_date: payload?.purchaseDetailInfo?.orderDate,
          tender_type: payload?.purchaseDetailInfo?.tenderType?.typeCode,
          receive_count: 1,
          supplier: +payload?.purchaseDetailInfo?.supplier?.id,
          will_received_again: +serviceActionId === 5 ? false : true,
          created_by: userId,
          created_at: new Date(),
          doptor_id: doptorId,
          purchase_doc: JSON.stringify(payload?.documentList),
        });

        const purchaseMstResult = (await transaction.query(purchaseMstSql, purchaseMstParams)).rows[0]?.id;

        // throw new BadRequestError("stop");
        if (purchaseMstResult) {
          payload?.itemsTobePurchased?.map(async (item: any) => {
            const { sql: purchaseInfoDtlSql, params: purchaseInfoDtlParams } = buildInsertSql(
              "inventory.purchase_info_dtl",
              {
                purchase_mst_id: +purchaseMstResult,
                item_id: item?.itemId?.id,
                ordered_quantity: item?.orderedQuantity ? +item?.orderedQuantity : "",
                approved_quantity: item?.approvedQuantity ? +item?.approvedQuantity : "",
                received_quantity: item?.receivedQuantity ? +item?.receivedQuantity : "",
                unit_price: item?.pricePerUnit,
                received_date: new Date(),
                received_by: +userId,
                created_by: userId,
                created_at: new Date(),
              }
            );
            await transaction.query(purchaseInfoDtlSql, purchaseInfoDtlParams);
          });
        } else {
          throw new BadRequestError("Something went wrong");
        }
      }
      //Update Store

      const storeIdSql = `select id from inventory.store_info where admin_desk_id = $1`;
      const storeId = (await transaction.query(storeIdSql, [designationId])).rows[0]?.id;
      if (!storeId) {
        throw new BadRequestError(`আপনার মালামাল গ্রহণের অনুমতি নেই`);
      }
      const storeAdminSql = `select admin_desk_id from inventory.store_info where id = $1`;
      const storeAdminDesignationId = (await transaction.query(storeAdminSql, [storeId])).rows[0].admin_desk_id;

      if (+storeAdminDesignationId !== +designationId) {
        throw new BadRequestError(`আপনার মালামাল গ্রহণের অনুমতি নেই`);
      }
      const approveUserSql = `select id, user_id from temps.application_approval
      where application_id =$1 and service_action_id = $2 order by id desc`;

      const approvalUser = (await transaction.query(approveUserSql, [data?.applicationId, 3])).rows;

      const lastIndex = approvalUser.length - 1;

      const approvalUserId = approvalUser[0];

      if (+userId === +approvalUserId?.user_id) {
        throw new BadRequestError(`অনুমোদন প্রদান করা বেক্তি মালামাল গ্রহণ করতে পারবে না`);
      }
      for (let item of payload?.itemsTobePurchased) {
        if (!item?.storeId) {
          throw new BadRequestError(`${item?.itemId?.itemName} এর ষ্টোরের নাম প্রদান করুন`);
        }
      }
      const storeItemSql = `select store_id, item_id, quantity from inventory.store_item where store_id = $1`;
      const storeItems = (await transaction.query(storeItemSql, [storeId])).rows;
      let storeItemsObj: any = {};
      for (let item of storeItems) {
        storeItemsObj[`${item?.item_id}`] = item?.quantity;
      }

      for (let item of payload?.itemsTobePurchased) {
        // throw new BadRequestError("storstop");
        if (storeItemsObj[+item?.itemId?.id] || storeItemsObj[+item?.itemId?.id] === 0) {
          const updateStoreItemQuantitySql = `update inventory.store_item set quantity = $1 where store_id = $2 and item_id = $3`;
          transaction.query(updateStoreItemQuantitySql, [
            +storeItemsObj[+item?.itemId?.id] + +item?.receivedQuantity,
            storeId,
            item.itemId?.id,
          ]);
        } else {
          const { sql, params } = buildInsertSql("inventory.store_item", {
            storeId: +item?.storeId,
            itemId: +item?.itemId?.id,
            quantity: +item?.receivedQuantity,
            createdBy: userId,
            createdAt: new Date(),
          });
          await transaction.query(sql, params);
        }
        //insert data in to fixed item table
        const { assetType, receivedQuantity, itemId, storeId: storeId2 } = item;

        if (assetType) {
          //   throw new BadRequestError("stopstop");
          const fixedAssetInfoSql = `select max_sl,prefix,sl_number_length from inventory.doptor_item
                  where item_id = $1 and doptor_id = $2`;
          const fixedAssetInfoData = (await transaction.query(fixedAssetInfoSql, [item?.itemId?.id, doptorId])).rows[0];

          const { max_sl, prefix, sl_number_length } = fixedAssetInfoData;
          let slNumber = max_sl;

          for (let i = 0; i < receivedQuantity; i++) {
            const prefixeSerialNumber = await this.leftPadding(slNumber, sl_number_length);

            const assetCode = prefix + prefixeSerialNumber;

            const { sql, params } = buildInsertSql("inventory.fixed_item", {
              itemId: item?.itemId?.id,
              assetCode: assetCode,
              status: 173,
              doptorId: doptorId,
              storeId: storeId2,
              isUsed: false,
              createdBy: +userId,
              createdAt: new Date(),
            });

            const id = await (await transaction.query(sql, params)).rows[0].id;
            slNumber++;
          }
          const updateMaxSlSql = `update inventory.doptor_item set max_sl=$1 where item_id=$2 and doptor_id=$3`;
          transaction.query(updateMaxSlSql, [slNumber, item?.itemId?.id, doptorId]);
        }
      }
      //update next app deisignation id
      //   const applicationUpdateQuery = `UPDATE
      //   temps.application
      // SET
      //   status = $1,
      //   updated_at = $2,
      //   updated_by = $3,
      //   next_app_designation_id = $4
      // WHERE
      //   id = $5`;

      //   const applicationUpdateParams = [
      //     payload?.willReceivedPurchasedProductAgain ? "P" : "A",
      //     new Date(),
      //     userId,
      //     payload?.willReceivedPurchasedProductAgain ? +designationId : 0,
      //     Number(data?.applicationId),
      //   ];
      //   console.log({ applicationUpdateParams });
      //   console.log(
      //     "willReaceive",
      //     payload?.willReceivedPurchasedProductAgain,
      //     typeof payload?.willReceivedPurchasedProductAgain
      //   );
      //   // throw new BadRequestError("stop");
      //   await transaction.query(applicationUpdateQuery, applicationUpdateParams);
      // await transaction.query("COMMIT");
    }
  }
}
