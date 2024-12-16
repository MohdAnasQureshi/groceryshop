import { transcoder } from "googleapis/build/src/apis/transcoder/index.js";
import { ShopOwner } from "../models/shopOwner.model.js";
import { StockOrderList } from "../models/stockOrderList.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addStockList = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner.id;
  const { stockList } = req.body;
  if (!stockList) {
    throw new ApiError(400, "Stock list empty! Nothing to add");
  }
  const newStock = await StockOrderList.create({
    stockList: stockList.toLowerCase(),
    shopOwnerId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, newStock, "Stock List added."));
});

const editStockList = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner._id;
  const { stockListId } = req.params;
  const { editedStockList } = req.body;

  const shopOwner = await ShopOwner.findById({ _id: shopOwnerId });
  if (!shopOwner) {
    throw new ApiError(404, "Shop Owner not found");
  }

  if (!editedStockList) {
    throw new ApiError(401, "Nothing changed");
  }

  const updatedStockList = await StockOrderList.findByIdAndUpdate(
    { _id: stockListId },
    {
      $set: {
        stockList: editedStockList.toLowerCase(),
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedStockList, "Stock List updated."));
});

const deleteStockList = asyncHandler(async (req, res) => {
  const { stockListId } = req.params;
  if (!stockListId) {
    throw new ApiError(401, "StockList id required");
  }

  const stockList = await StockOrderList.findOne({ _id: stockListId });
  if (!stockList) {
    throw new ApiError(404, "Stock List not found");
  }
  const deletedStockList = await StockOrderList.deleteOne({ _id: stockListId });
  return res
    .status(200)
    .json(new ApiResponse(200, deletedStockList, "Stock List deleted."));
});

const getAllStockLists = asyncHandler(async (req, res) => {
  const shopOwnerId = req.shopOwner.id;

  const shopOwner = await ShopOwner.find({ _id: shopOwnerId });

  if (!shopOwner) {
    throw new ApiError(404, "Shop Owner not found");
  }

  const allStockLists = await StockOrderList.find({ shopOwnerId });

  return res
    .status(200)
    .json(new ApiResponse(200, allStockLists, "All lists fetched"));
});

export { addStockList, editStockList, deleteStockList, getAllStockLists };
