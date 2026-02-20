const Media = require("../models/Media.js");
const logger = require("../utils/logger.js");
const { uploadMediaToCloudinary } = require("../utils/cloudinary.js");

//---------controllers---------------------

//-POST UPLOAD MEDIA
const uploadMedia = async (req, res) => {
  logger.info("Starting Media upload...");
  try {
    //--check if file exists in request
    if (!req.file) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!",
      });
    }

    //--get data from request file
    const { originalname, mimetype, buffer } = req.file;

    //--from authMiddleware get req.user ={userId}
    const userId = req.user.userId;
    logger.info(`File details: name = ${originalname}, type= ${mimetype}`);
    logger.info("Uploading to cloudinary starting ...");

    //upload file to cloudinary
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`,
    );

    //-save it in DB
    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successfully",
    });
  } catch (error) {
    logger.error("Error Uploading file ", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
    });
  }
};

//-GET ALL MEDIA
const getAllMedia = async (req, res) => {
  try {
    const results = await Media.find({});
    res.json({ results });
  } catch (error) {
    logger.error("Error fetching medias", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medias",
    });
  }
};

//--
module.exports = { uploadMedia, getAllMedia };
