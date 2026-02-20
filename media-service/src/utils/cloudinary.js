const cloudinary = require("cloudinary").v2;
const logger = require("./logger.js");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//This is an asynchronous function designed to handle the file upload
//It returns a Promise, which allows you to use
//async/await syntax for clean and readable code
//uploadMedia (image)---> upload to cloudinary cloud
const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    //creates a writable stream. This is a highly efficient way
    //to handle uploads, especialy for large files,
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error("Error while uploading media to cloudinary", error);
          reject(error);
        } else {
          resolve(result);
        }
      }, //function end
    );
    uploadStream.end(file.buffer);
  }); //Promise end
};

//---DELETE file from cloudinary--------
const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Media deleted successfully from cloud storage", publicId);
    return result;
  } catch (error) {
    logger.error("Error deleting media from cloudinary", error);
    throw error;
  }
};

//---
module.exports = {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
};
