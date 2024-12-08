import { Transaction } from "../models/transaction.model.js";
import { ShopOwner } from "../models/shopOwner.model.js";
import { Customer } from "../models/customer.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const addTransaction = asyncHandler(async (req, res) => {
  // Extract shopOwnerId from the token (added by verifyJWT middleware)
  const shopOwnerId = req.shopOwner.id;

  // Extract customerId from the request params and transaction details from the body
  const { customerId } = req.params;
  const { amount, transactionType } = req.body;

  // Validate input
  if (!customerId) {
    throw new ApiError(400, "Customer ID is required");
  }
  if (!amount || amount <= 0) {
    throw new ApiError(400, "Valid transaction amount is required");
  }
  if (!["debt", "payment"].includes(transactionType)) {
    throw new ApiError(
      400,
      "Transaction type must be either 'debt' or 'payment'"
    );
  }

  // Check if the customer exists and belongs to the shop owner
  const customer = await Customer.findOne({
    _id: customerId,
    shopOwnerId: shopOwnerId,
  });
  if (!customer) {
    throw new ApiError(404, "Customer not found or not authorized");
  }

  // Create a new transaction
  const transaction = new Transaction({
    shopOwnerId,
    customerId,
    amount,
    transactionType,
  });

  // Save the transaction
  await transaction.save();

  res
    .status(201)
    .json(
      new ApiResponse(200, transaction, "Transaction added successfully!!")
    );
});
export { addTransaction };
