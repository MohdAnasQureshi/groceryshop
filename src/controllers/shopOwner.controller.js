import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ShopOwner } from "../models/shopOwner.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerShopOwner = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, shopOwnerName, password } = req.body;
  console.log(email);

  // validation - not empty
  if (
    [fullName, email, shopOwnerName, password].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if shopowner already exists : email
  const existedShopOwner = ShopOwner.findOne({ email });
  if (existedShopOwner) {
    throw new ApiError(409, "Shop owner with this email already exists!!");
  }

  // check for images
  const shopOwnerPhotoLocalpath = req.files?.shopOwnerPhoto[0]?.path;

  if (!shopOwnerPhotoLocalpath) {
    throw new ApiError(400, "ShopOwner image file is required");
  }

  // upload them to cloudinary
  const shopOwnerPhoto = await uploadOnCloudinary(shopOwnerPhotoLocalpath);
  if (!shopOwnerPhoto) {
    throw new ApiError(400, "ShopOwner image file is required");
  }

  // create user object - create entry in db
  const shopOwner = await ShopOwner.create({
    fullName,
    shopOwnerPhoto: shopOwnerPhoto.url,
    email,
    password,
    shopOwnerName: shopOwnerName.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdShopOwner = await ShopOwner.findById(shopOwner._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdShopOwner) {
    throw new ApiError(500, "Something went wrong while registering shopowner");
  }

  // return res
  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        createdShopOwner,
        "Shop owner registered successfully"
      )
    );
});

export { registerShopOwner };
