import Container, { Service } from "typedi";
import { BadRequestError, buildInsertSql } from "rdcd-common";
import db from "../../../db/connection.db";
import { toCamelKeys } from "keys-transform";
import { PoolClient, Pool } from "pg";
import moment from "moment";
import { ApplicationServices } from "../../application/services/application.service";

@Service()
export class ItemReturnService {
  async getReturnableItems(employeeId: number) {
    const connection = db.getConnection("slave");
    const sql = `select distinct e.id as fixed_item_use_id, d.id as fixed_item_id,c.id as item_id,
    c.item_name,c.is_asset,c.goods_type,f.display_value,d.asset_code 
    from inventory.item_delivery_mst a 
    inner join inventory.item_delivery_dtl b on a.id = b.delivery_mst_id
    inner join inventory.item_info c on c.id = b.item_id and c.is_asset=true
    left join inventory.fixed_item d on d.item_id = c.id and d.is_used = true
    left join inventory.fixed_asset_use_info e on d.id = e.fixed_item_id and e.return_date is null
    inner join master.code_master f on f.id = c.goods_type
   where  a.employee_id = $1
    AND (d.id IS NOT NULL OR c.is_asset <> true) order by c.id`;
    try {
      const queryResult = (await connection.query(sql, [employeeId])).rows;
      return queryResult.length > 0 ? toCamelKeys(queryResult) : [];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getNonFixedReturnableItems(employeeId: number) {
    const connection = db.getConnection("slave");
    const sql = `	SELECT
                  c.id AS item_id,
                  c.is_asset,
                  c.item_name,
                  c.goods_type,
                  d.display_value,
                  COALESCE(
                    CAST(COALESCE(SUM(b.delivery_quantity), 0) AS INTEGER) -
                    CAST(COALESCE(SUM(e.quantity), 0) AS INTEGER), 0
                ) AS max_returnable_quantity
                  FROM
                  inventory.item_delivery_mst a
                  INNER JOIN
                  inventory.item_delivery_dtl b ON a.id = b.delivery_mst_id
                  INNER JOIN
                  inventory.item_info c ON c.id = b.item_id AND c.is_asset = false
                  INNER JOIN
                  master.code_master d ON d.id = c.goods_type
                  LEFT JOIN 
                  inventory.item_return_dtl e ON e.item_id = b.item_id
                  WHERE
                  a.employee_id = $1
                  GROUP BY
                  c.id, c.is_asset, c.item_name, c.goods_type, d.display_value`;
    try {
      const result = (await connection.query(sql, [employeeId])).rows;
      return result?.length > 0 ? toCamelKeys(result) : [];
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async getReturnedItemsDetails(id: number, type: string, pool: Pool) {
    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    const sql = `select service_id ,next_app_designation_id, status,data from temps.application where id = $1`;
    const userNameAndDesignationNameSqlOfTheApplicantSql = ` select b.name,c.name_bn as designation_name from temps.application a inner join 
users.user b on  b.id::varchar =a.created_by
inner join master.office_designation c on c.id = b.designation_id
where a.id = $1`;
    const queryResult = await (await pool.query(sql, [id])).rows[0];
    const queryResult2 = (await pool.query(userNameAndDesignationNameSqlOfTheApplicantSql, [id])).rows[0];
    const appHistory = await applicationService.getAppHistory(id, pool);
    return toCamelKeys({
      ...queryResult,
      type: type,
      name: queryResult2?.name,
      designation: queryResult2?.designation_name,
      history: appHistory,
    });
  }
  async getReturnedAmmountOfTheItem(employeeId: number, itemId: number, transaction: PoolClient) {
    const returnedAmmountSql = `select sum(b.quantity) from inventory.item_return_mst a 
    inner join inventory.item_return_dtl b 
    on a.id = b.return_mst_id where a.employee_id =$1 and b.item_id = $2`;
    const totalAmmount = (await transaction.query(returnedAmmountSql, [employeeId, itemId])).rows[0]?.sum;

    return totalAmmount ? +totalAmmount : 0;
  }
  async getConsumedAmmountOfTheItem(employeeId: number, itemId: number, transaction: PoolClient) {
    const consumedAmountSql = `select sum(b.delivery_quantity)  from inventory.item_delivery_mst a inner join
  inventory.item_delivery_dtl b on a.id = b.delivery_mst_id
  where a.employee_id = $1 and b.item_id = $2`;

    const totalAmmount = (await transaction.query(consumedAmountSql, [employeeId, itemId])).rows[0]?.sum;

    return totalAmmount;
  }
  async getItemCountInStore(itemId: number, storeId: number, transaction: PoolClient) {
    const countSql = `select quantity from inventory.store_item where item_id = $1 and store_id =$2`;
    const { quantity } = (await transaction.query(countSql, [itemId, storeId])).rows[0];
    return quantity;
  }
  async receiveReturnedItem(
    data: any,
    transaction: PoolClient,
    userId: Number,
    serviceActionId: number,
    designationId: number,
    doptorId: number
  ) {
    const { applicationId } = data;
    let employeeId: number;
    const applicantIdSql = `select created_by from temps.application where id =$1`;
    const applicantId = (await transaction.query(applicantIdSql, [applicationId])).rows[0]?.created_by;
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
    if (applicantId) {
      const employeeIdSql = `select employee_id from users.user where id = $1`;
      const { employee_id } = (await transaction.query(employeeIdSql, [applicantId])).rows[0];
      employeeId = employee_id;
      if (data?.payload) {
        const payload = JSON.parse(data?.payload);

        if (payload?.returnedItems) {
          let itemWiseMaxReturnAmmountObj: any = {};
          let itemWiseItemStatusFromDataBaseObj: any = {};
          let itemWiseItemCountInStoreObj: any = {};
          const { returnedItems } = payload;
          for (let item of returnedItems) {
            if (!itemWiseMaxReturnAmmountObj[item?.itemId?.itemId]) {
              itemWiseMaxReturnAmmountObj[item?.itemId?.itemId] =
                +(await this.getConsumedAmmountOfTheItem(+employeeId, +item?.itemId?.itemId, transaction)) -
                (await this.getReturnedAmmountOfTheItem(+employeeId, +item?.itemId?.itemId, transaction));
            }
            if (!itemWiseItemCountInStoreObj[item?.itemId?.itemId]) {
              itemWiseItemCountInStoreObj[item?.itemId?.itemId] = await this.getItemCountInStore(
                item?.itemId?.itemId,
                item?.storeId,
                transaction
              );
            }
          }
          const applicationDataSql = `select data from temps.application where id = $1`;
          const { data, created_at } = (await transaction.query(applicationDataSql, [applicationId])).rows[0];

          const returnedItemsFromDatabase = data?.returned_items;
          for (let item of returnedItemsFromDatabase) {
            if (!itemWiseItemStatusFromDataBaseObj[item?.item_id?.item_id]) {
              itemWiseItemStatusFromDataBaseObj[item?.item_id?.item_id] = item?.item_status;
            }
          }

          const { sql, params } = buildInsertSql("inventory.item_return_mst", {
            application_id: applicationId,
            employee_id: +employeeId,
            apply_date: moment(created_at).format("DD/MM/YYYY"),
            receive_date: moment(new Date()).format("DD/MM/YYYY"),
            created_by: userId,
            created_at: new Date(),
          });
          const returnMst = (await transaction.query(sql, params)).rows[0];

          if (returnMst?.id) {
            for (let item of returnedItems) {
              const { itemId } = item?.itemId;

              if (
                item?.returnedQuantity > itemWiseMaxReturnAmmountObj[itemId] &&
                itemWiseMaxReturnAmmountObj[itemId] !== 0
              ) {
                throw new BadRequestError(
                  `আপনি গ্রহণকৃত ${itemWiseMaxReturnAmmountObj[itemId]} টি ${item?.itemId?.itemName} থেকে বেশি ${item?.itemId?.itemName} ফেরত দিতে পারবেন না`
                );
              }

              const { sql, params } = buildInsertSql("inventory.item_return_dtl", {
                return_mst_id: returnMst?.id,
                item_id: +itemId,
                item_status_given_by_applicant: itemWiseItemStatusFromDataBaseObj[item?.itemId?.itemId],
                item_status_given_by_receiver: item?.itemStatus,
                quantity: item?.returnedQuantity,
                created_by: userId,
                created_at: new Date(),
              });
              await transaction.query(sql, params);
              if (+item?.assetType) {
                const updateFixedAssetUseInfoSql = `update inventory.fixed_asset_use_info set return_date = $1 where id = $2`;
                const updateFixedAssetUseInfoSqlResult = await transaction.query(updateFixedAssetUseInfoSql, [
                  new Date(),
                  item?.itemId?.fixedItemUseId,
                ]);

                const updateFixedItemSql = `update inventory.fixed_item set status=$1, is_used=false ,updated_at=$2,updated_by=$3 where id = $4`;
                const updateFixedItemSqlResult = await transaction.query(updateFixedItemSql, [
                  item?.itemStatus,
                  new Date(),
                  userId,
                  item?.itemId?.fixedItemId,
                ]);
              }

              const updateStoreItemSql = `update inventory.store_item set quantity = $1 where item_id = $2 and store_id = $3`;
              const updateSqlResult = await transaction.query(updateStoreItemSql, [
                itemWiseItemCountInStoreObj[itemId] + item?.returnedQuantity,
                itemId,
                item?.storeId,
              ]);
            }
          }
        }
      }
    }
  }
}
