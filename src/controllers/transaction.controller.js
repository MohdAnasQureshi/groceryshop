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
  const { amount, transactionType, transactionDetails } = req.body;

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
    transactionDetails,
  });

  // Save the transaction
  await transaction.save();

  customer.totalOutstandingDebt =
    transaction.transactionType === "debt"
      ? customer.totalOutstandingDebt + transaction.amount
      : customer.totalOutstandingDebt - transaction.amount;

  await customer.save();

  return res
    .status(201)
    .json(
      new ApiResponse(200, transaction, "Transaction added successfully!!")
    );
});

const getCustomerTransactions = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner.id;
  const { customerId } = req.params;
  if (!customerId) {
    throw new ApiError(400, "Customer Id is required");
  }

  // check whether the customer exists and belongs to the shop owner
  const customer = await Customer.findOne({
    _id: customerId,
    shopOwnerId,
  });
  if (!customer) {
    throw new ApiError(404, "Customer not found or not authorized");
  }

  // fetch all transactions for the customer

  const transactions = await Transaction.find({ customerId }).sort({
    transactionDate: 1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, transactions, "Transactions fetched successfully")
    );
});

const editTransaction = asyncHandler(async (req, res) => {
  const { customerId, transactionId } = req.params;
  const { amount, transactionType, transactionDetails } = req.body;

  if (!amount || !transactionType) {
    throw new ApiError(400, "Amount and transaction type required");
  }

  // fetch the transaction to be updated
  const transaction = await Transaction.findOne({
    _id: transactionId,
    customerId: customerId,
  });

  if (!transaction) {
    throw new ApiError(404, "Transaction not found for this customer");
  }

  console.log(transaction.amount);
  const transactions = await Transaction.find({ customerId });
  let totalOutstandingDebt = transactions.reduce((total, transaction) => {
    return transaction.transactionType === "debt"
      ? total + transaction.amount
      : total - transaction.amount;
  }, 0);
  console.log(totalOutstandingDebt);
  if (transaction.transactionType === "debt")
    totalOutstandingDebt = totalOutstandingDebt - transaction.amount;
  console.log(totalOutstandingDebt);
  if (transaction.transactionType === "payment")
    totalOutstandingDebt = totalOutstandingDebt + transaction.amount;
  console.log(totalOutstandingDebt);

  if (transactionType === "debt")
    totalOutstandingDebt = totalOutstandingDebt + amount;
  console.log(totalOutstandingDebt);
  if (transactionType === "payment")
    totalOutstandingDebt = totalOutstandingDebt - amount;
  console.log(totalOutstandingDebt);

  await Customer.findByIdAndUpdate(
    { _id: customerId },
    {
      $set: {
        totalOutstandingDebt,
      },
    },
    {
      new: true,
    }
  );

  transaction.amount = amount;
  transaction.transactionType = transactionType;
  transaction.transactionDetails = transactionDetails;
  await transaction.save();

  return res
    .status(200)
    .json(new ApiResponse(200, transaction, "Updated the transaction details"));
});

const deleteTransaction = asyncHandler(async (req, res) => {
  const { customerId, transactionId } = req.params;

  // fetch the transaction to be deleted
  const transaction = await Transaction.findOne({
    _id: transactionId,
    customerId: customerId,
  });

  if (!transaction) {
    throw new ApiError(
      404,
      "Transaction not found for this customer to delete"
    );
  }

  const transactions = await Transaction.find({ customerId });

  let totalOutstandingDebt = transactions.reduce((total, transaction) => {
    return transaction.transactionType === "debt"
      ? total + transaction.amount
      : total - transaction.amount;
  }, 0);
  if (transaction.transactionType === "debt")
    totalOutstandingDebt = totalOutstandingDebt - transaction.amount;
  else totalOutstandingDebt = totalOutstandingDebt + transaction.amount;

  await Customer.findByIdAndUpdate(
    { _id: customerId },
    {
      $set: {
        totalOutstandingDebt,
      },
    },
    {
      new: true,
    }
  );
  await Transaction.deleteOne({
    _id: transactionId,
    customerId: customerId,
  });
  return res.status(200).json(new ApiResponse(200, "Deleted the transaction"));
});

export {
  addTransaction,
  getCustomerTransactions,
  editTransaction,
  deleteTransaction,
};
