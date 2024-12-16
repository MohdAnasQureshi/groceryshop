import mongoose, { Schema } from "mongoose";
import { type } from "os";

const transactionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    shopOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "ShopOwner",
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["debt", "payment"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionDetails: {
      type: String,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
