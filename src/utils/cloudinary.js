import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload an image
const uploadOnCloudinary = async (shopOwnerPhotoLocalpath) => {
  try {
    if (!shopOwnerPhotoLocalpath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(shopOwnerPhotoLocalpath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    // console.log("File is uploaded on cloudinary", response.url);
    fs.unlinkSync(shopOwnerPhotoLocalpath);
    return response;
  } catch (error) {
    fs.unlinkSync(shopOwnerPhotoLocalpath); // remove the locally saved temporary file from the server as the upload operation failed
    return null;
  }
};

const deleteFromCloudinary = async (shopOwnerPhotoPublicId) => {
  try {
    if (!shopOwnerPhotoPublicId) return null;
    const response = await cloudinary.uploader.destroy(shopOwnerPhotoPublicId);
    return response;
  } catch (error) {
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
