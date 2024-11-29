import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const customerSchema = new Schema(
  {
    customerName: {
      type: String,
      required: true,
      index: true,
    },
    customerOf: {
      type: Schema.Types.ObjectId,
      ref: "ShopOwner",
    },
    customerContact: {
      type: String,
      required: true,
    },
    totalOutstandingDebt: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

customerSchema.plugin(mongooseAggregatePaginate);

export const Customer = mongoose.model("Customer", customerSchema);
