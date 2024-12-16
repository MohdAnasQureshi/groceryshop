import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
// import { verifyEmail } from "../utils/verifyEmail.js";
import { ShopOwner } from "../models/shopOwner.model.js";
import crypto from "crypto";
import { sendEmailtoShopOwner } from "../utils/sendEmailtoShopOwner.js";
import { oauth2client } from "../config/googleAuthConfig.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import bcrypt from "bcrypt";
import { TempOTP } from "../models/tempOTP.model.js";

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

const sendVerificationOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existedShopOwner = await ShopOwner.findOne({ email });
  if (existedShopOwner) {
    throw new ApiError(409, "Shop owner with this email already exists!!");
  }
  const verifyEmailOTP = crypto.randomInt(100000, 999999).toString();

  const otpData = await TempOTP.create({ email, otp: verifyEmailOTP });

  try {
    await sendEmailtoShopOwner({
      to: email,
      subject: "Your OTP to register at kiranaKhata.in",
      text: `Your OTP is ${verifyEmailOTP}. It is valid for 5 minutes. Do not share it with anyone `,
    });
    return res.status(200).json({ message: "OTP send to your email" });
  } catch (error) {
    await TempOTP.deleteOne({ _id: otpData._id, email });
    return res.status(500).json({
      message:
        "Email could not be sent. Check whether the email entered by you is a valid google email!!",
      error,
    });
  }
});

const registerShopOwner = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, shopOwnerName, password, shopOwnerPhoto, inputOtp } =
    req.body;
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

  // const emailValidationResult = await verifyEmail(email);
  // if (emailValidationResult.status !== "valid") {
  //   throw new ApiError(400, "Invalid email address");
  // }

  // check for images
  const shopOwnerPhotoLocalpath = req.files?.shopOwnerPhoto[0]?.path;
  // console.log(shopOwnerPhotoLocalpath);

  if (!shopOwnerPhotoLocalpath) {
    throw new ApiError(400, "ShopOwner image file is required");
  }

  const tempRecord = await TempOTP.findOne({ email });
  if (!tempRecord) {
    throw new ApiError(400, "OTP expired or invalid");
  }

  const isOTPValid = await bcrypt.compare(inputOtp, tempRecord.otp);
  const isOTPExpired = Date.now() > tempRecord.expiresAt;

  if (isOTPExpired) {
    await TempOTP.deleteOne({ email });
    throw new ApiError(400, "OTP has expired");
  }

  if (!isOTPValid) {
    throw new ApiError(401, "Incorrect OTP entered");
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

  await TempOTP.deleteOne({ _id: tempRecord._id, email });
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
      $unset: { refreshToken: 1 },
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
  // console.log(currentPassword, newPassword, confirmPassword);
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
  const currentShopOwner = await ShopOwner.aggregate([
    {
      $match: {
        _id: req.shopOwner?._id,
        // shopOwnerName: req.shopOwner?.shopOwnerName,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "shopOwnerId",
        as: "shopOwnerCustomers",
      },
    },
    {
      $addFields: {
        shopOwnerCustomersCount: {
          $size: "$shopOwnerCustomers",
        },
        shopOwnerCustomers: {
          $ifNull: ["$shopOwnerCustomers", []],
        },
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        shopOwnerName: 1,
        shopOwnerPhoto: 1,
        shopOwnerCustomersCount: 1,
        shopOwnerCustomers: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!currentShopOwner?.length) {
    throw new ApiError(404, "Shop Owner doesnot exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        currentShopOwner[0],
        "Current Shop Owner fetched successfully"
      )
    );
});

const updateShopOwnerDetails = asyncHandler(async (req, res) => {
  const { shopOwnerName, fullName, email } = req.body;

  if (!(email || fullName || shopOwnerName)) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedShopOwner = await ShopOwner.findByIdAndUpdate(
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

  const parts = req.shopOwner.shopOwnerPhoto.split("/upload/");
  // console.log(parts);
  const path = parts[1];
  const public_id = path?.split(".")[0]?.split("/")[1];
  // console.log(public_id);
  await deleteFromCloudinary(public_id);

  return res
    .status(200)
    .json(
      new ApiResponse(200, shopOwner, "Shop Owner photo successfully updated")
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const shopOwner = await ShopOwner.findOne({ email });
  if (!shopOwner) {
    throw new ApiError(404, "No shop owner found with this email");
  }
  const resetToken = crypto.randomBytes(32).toString("hex");
  // console.log(resetToken);
  shopOwner.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  shopOwner.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await shopOwner.save();
  const resetURL = `${req.protocol}://${req.get("host")}/api/v1/shopOwners/reset-password/${resetToken}`;
  // send email with the reset link
  try {
    await sendEmailtoShopOwner({
      to: shopOwner.email,
      subject: "Password reset request",
      text: `You requested a password reset. Click the link to reset your password: ${resetURL}`,
    });
    return res.status(200).json({ message: "Reset link send to your email" });
  } catch (error) {
    shopOwner.resetPasswordToken = undefined;
    shopOwner.resetPasswordExpires = undefined;
    await shopOwner.save();
    return res.status(500).json({ message: "Email could not be sent", error });
  }
});
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirm password do not match");
  }
  // hash the token and find the shopOwner
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shopOwner = await ShopOwner.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
  });
  if (!shopOwner) {
    throw new ApiError(400, "Invalid or expired token");
  }
  // update password
  shopOwner.password = newPassword;
  shopOwner.resetPasswordToken = undefined;
  shopOwner.resetPasswordExpires = undefined;
  await shopOwner.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, shopOwner, "Password has been reset"));
});

const googleAuth = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const googleResponse = await oauth2client.getToken({
    code,
    redirect_uri: process.env.REDIRECT_URI,
  });
  oauth2client.setCredentials(googleResponse.tokens);

  const shopOwnergoogleDetails = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleResponse.tokens.access_token}`
  );
  // console.log(shopOwnergoogleDetails);
  const { email, name, picture, id: googleId } = shopOwnergoogleDetails.data;
  let shopOwner = await ShopOwner.findOne({ email, googleId });
  console.log(shopOwner);
  if (!shopOwner) {
    shopOwner = await ShopOwner.create({
      shopOwnerName: name,
      email,
      shopOwnerPhoto: picture,
      googleId,
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    shopOwner._id
  );
  console.log(accessToken, refreshToken);

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
        "ShopOwner logged in successfully with Google auth"
      )
    );
});

const setPassword = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new ApiError(400, "The passwords doesnot match");
  }

  const shopOwner = await ShopOwner.findOne({ email });

  if (!shopOwner) {
    throw new ApiResponse(404, "ShopOwner not found");
  }

  if (!shopOwner.googleId) {
    throw new ApiError(400, "This shop owner is not a Google user ");
  }

  if (shopOwner.password) {
    throw new ApiError(401, "Password already set by user");
  }

  shopOwner.password = password;
  await shopOwner.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password set Successfully for google email user"
      )
    );
});

export {
  sendVerificationOTP,
  registerShopOwner,
  loginShopOwner,
  logoutShopOwner,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentShopOwner,
  updateShopOwnerDetails,
  updateShopOwnerPhoto,
  forgotPassword,
  resetPassword,
  googleAuth,
  setPassword,
};
