import { ShopOwner } from "../models/shopOwner.model.js";
import { Customer } from "../models/customer.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Transaction } from "../models/transaction.model.js";

// Add a customer by a shopOwner
const addCustomer = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner.id;
  const { customerName, customerContact, totalOutstandingDebt, totalPaid } =
    req.body;
  //   console.log(shopOwnerId, customerName);
  if (!customerName) {
    throw new ApiError(401, "Customer Name Required");
  }
  // check if the shopOwner exists
  const shopOwner = await ShopOwner.findById(shopOwnerId);
  if (!shopOwner) {
    throw new ApiError(404, "Shop Owner not found");
  }
  const normalizeName = (name) => name.toLowerCase().replace(/\s+/g, ""); // Remove spaces and lowercase

  const normalizedCustomerName = normalizeName(customerName);

  // Check if the customer already exists with the same name
  const existingCustomers = await Customer.find({
    shopOwnerId,
  }).lean();

  const existingNames = existingCustomers.map((c) =>
    normalizeName(c.customerName)
  );
  if (existingNames.includes(normalizedCustomerName)) {
    throw new ApiError(400, "Customer with this name already exists!");
  }

  // create a new customer and associate it with the shopOwner
  const customer = await Customer.create({
    customerName: customerName.toLowerCase(),
    customerContact,
    totalOutstandingDebt,
    totalPaid,
    shopOwnerId: shopOwnerId,
  });
  // get this newly created customer
  const createdCustomer = await Customer.findById(customer._id);

  // check for customer creation
  if (!createdCustomer) {
    throw new ApiError(500, "Something went wrong while adding customer");
  }

  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdCustomer, "Customer added successfully"));
});

// delete a customer by a logged in shop Owner

const deleteCustomer = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner.id;
  const { customerId } = req.params;
  if (!customerId) {
    throw new ApiError(400, "Customer Id is required");
  }
  // find the customer by id and shop id
  const customer = await Customer.findOne({
    _id: customerId,
    shopOwnerId: shopOwnerId,
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found or not authorized to delete");
  }

  // Delete the customer
  await Customer.deleteOne({ _id: customerId });
  await Transaction.deleteMany({ customerId });
  return res
    .status(200)
    .json(new ApiResponse(200, "Customer deleted successfully"));
});

const editCustomer = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner.id;
  const { customerId } = req.params;
  const { customerName, customerContact } = req.body;

  if (!customerId) {
    throw new ApiError(400, "Customer id is required");
  }

  if (!(customerName || customerContact)) {
    throw new ApiError(400, "Customer name and contact are required");
  }
  const normalizeName = (name) => name.toLowerCase().replace(/\s+/g, ""); // Remove spaces and lowercase

  const normalizedCustomerName = normalizeName(customerName);

  // Find all customers of this shop owner
  const existingCustomers = await Customer.find({
    shopOwnerId,
    _id: { $ne: customerId },
  }).lean(); // Fetch an array

  // Normalize names of existing customers
  const existingNames = existingCustomers.map((c) =>
    normalizeName(c.customerName)
  );

  if (existingNames.includes(normalizedCustomerName)) {
    throw new ApiError(400, "Customer with this name already exists!");
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(
    customerId,
    {
      $set: {
        customerName: customerName.toLowerCase(),
        customerContact,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCustomer, "Customer updated successfully")
    );
});

const getAllCustomers = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner._id;
  const allCustomers = await Customer.find({ shopOwnerId });
  if (!allCustomers) {
    throw new ApiError(402, "Customers list not found or empty");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, allCustomers, "Customers list fetched successfully")
    );
});

export { addCustomer, deleteCustomer, editCustomer, getAllCustomers };
