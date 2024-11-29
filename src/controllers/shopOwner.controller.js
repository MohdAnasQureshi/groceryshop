import { asyncHandler } from "../utils/asyncHandler.js";

const registerShopOwner = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "ok",
  });
});

export { registerShopOwner };
