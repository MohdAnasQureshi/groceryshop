import mongoose, { Schema } from "mongoose";

const stockOrderListSchema = new Schema(
  {
    stockList: {
      type: String,
      required: true,
    },
    shopOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "ShopOwner",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const StockOrderList = mongoose.model(
  "StockOrderList",
  stockOrderListSchema
);
