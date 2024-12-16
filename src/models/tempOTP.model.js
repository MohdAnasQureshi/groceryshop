import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const tempOTPSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 5 * 60 * 1000, // expires in 5 minutes
  },
});

tempOTPSchema.pre("save", async function (next) {
  if (this.otp) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  next();
});

export const TempOTP = mongoose.model("TempOTP", tempOTPSchema);
