import { ShopOwner } from "../models/shopOwner.model.js";
import { Customer } from "../models/customer.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const customerNameInLowerCase = customerName.toLowerCase();
  // Check if the customer already exists with the same name
  const existingCustomer = await Customer.findOne({
    customerName: customerNameInLowerCase,
    shopOwnerId,
  });
  if (existingCustomer) {
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

export { addCustomer };
