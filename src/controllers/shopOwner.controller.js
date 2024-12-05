import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ShopOwner } from "../models/shopOwner.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (shopOwnerId) => {
  try {
    const shopOwner = await ShopOwner.findById(shopOwnerId);
    const accessToken = shopOwner.generateAccessToken();
    const refreshToken = shopOwner.generateRefreshToken();
    shopOwner.refreshToken = refreshToken;
    await shopOwner.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generatimg refresh and access tokens"
    );
  }
};

const registerShopOwner = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, shopOwnerName, password, shopOwnerPhoto } = req.body;
  // console.log(email, shopOwnerPhoto);

  // validation - not empty
  if (
    [fullName, email, shopOwnerName, password].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if shopowner already exists : email
  const existedShopOwner = await ShopOwner.findOne({ email });
  if (existedShopOwner) {
    throw new ApiError(409, "Shop owner with this email already exists!!");
  }

  // check for images
  const shopOwnerPhotoLocalpath = req.files?.shopOwnerPhoto[0]?.path;
  console.log(shopOwnerPhotoLocalpath);

  if (!shopOwnerPhotoLocalpath) {
    throw new ApiError(400, "ShopOwner image file is required");
  }

  // upload them to cloudinary
  const cloudinaryShopOwnerPhoto = await uploadOnCloudinary(
    shopOwnerPhotoLocalpath
  );
  if (!cloudinaryShopOwnerPhoto) {
    throw new ApiError(400, "ShopOwner image file is required");
  }

  // create user object - create entry in db
  const shopOwner = await ShopOwner.create({
    fullName,
    shopOwnerPhoto: cloudinaryShopOwnerPhoto.url,
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

const loginShopOwner = asyncHandler(async (req, res) => {
  // req body -> data

  const { email, shopOwnerName, password } = req.body;
  if (!(shopOwnerName || email)) {
    throw new ApiError(400, "ShopOwner name or email is required");
  }

  // shopownername or email

  // find the user
  const shopOwner = await ShopOwner.findOne({
    $or: [{ shopOwnerName }, { email }],
  });
  if (!shopOwner) {
    throw new ApiError(404, "Shop Owner does not exist");
  }

  //password check

  const isPasswordValid = await shopOwner.isPasswordCorrect(password);
  // console.log(password, isPasswordValid);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid shop owner credentials");
  }

  // access anf refresh token generate and send
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    shopOwner._id
  );

  // send refresh and access token as secure cookie

  const loggedInShopOwner = await ShopOwner.findById(shopOwner._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          shopOwner: loggedInShopOwner,
          accessToken,
          refreshToken,
        },
        "ShopOwner logged in successfully"
      )
    );
});

const logoutShopOwner = asyncHandler(async (req, res) => {
  await ShopOwner.findByIdAndUpdate(
    req.shopOwner._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // console.log(decodedToken, incomingRefreshToken);

    const shopOwner = await ShopOwner.findById(decodedToken?._id);
    if (!shopOwner) {
      throw new ApiError(401, "invalid refesh token");
    }

    if (incomingRefreshToken !== shopOwner?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(shopOwner._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refershed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(401, "new password doesnot match with confirm password");
  }

  const shopOwner = await ShopOwner.findById(req.shopOwner?._id);
  const isPasswordCorrect = await shopOwner.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid current password");
  }

  shopOwner.password = newPassword;
  await shopOwner.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentShopOwner = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.shopOwner, "Current Shop Owner fetched successfully");
});

const updateShopOwner = asyncHandler(async (req, res) => {
  const { shopOwnerName, fullName, email } = req.body;

  if (!email || !fullName || !shopOwnerName) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedShopOwner = ShopOwner.findByIdAndUpdate(
    req.shopOwner?._id,
    {
      $set: {
        fullName,
        email,
        shopOwnerName,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedShopOwner,
        "Shop Owner  details updated successfully"
      )
    );
});

const updateShopOwnerPhoto = asyncHandler(async (req, res) => {
  const newShopOwnerPhotoLocalPath = req.file?.path;
  if (!newShopOwnerPhotoLocalPath) {
    throw new ApiError(400, "Shop Owner Photo is missing");
  }
  const shopOwnerPhoto = await uploadOnCloudinary(newShopOwnerPhotoLocalPath);

  if (!shopOwnerPhoto.url) {
    throw new ApiError(400, "Error while uploading the photo");
  }

  const shopOwner = await ShopOwner.findByIdAndUpdate(
    req.shopOwner?._id,
    {
      $set: {
        shopOwnerPhoto: shopOwnerPhoto.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, shopOwner, "Shop Owner photo successfully updated")
    );
});

export {
  registerShopOwner,
  loginShopOwner,
  logoutShopOwner,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentShopOwner,
  updateShopOwner,
  updateShopOwnerPhoto,
};
