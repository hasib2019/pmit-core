export interface ItemAttributes {
  id?: number;
  groupId?: number;
  categoryId: number;
  itemName: String;
  itemCode?: number;
  description: String;
  model: String;
  mouId: number;
  unitPrice: number;
  goodsType: boolean;
  isActive: boolean;
  doptorItems?: any;
  createdBy?: String;
  createdAt?: Date;
  updatedBy?: String;
  updatedAt?: Date;
  updateHistory?: any;
}
