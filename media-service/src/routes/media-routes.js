const express = require("express");
const multer = require("multer");

const {
  uploadMedia,
  getAllMedia,
} = require("../controllers/media-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");
const logger = require("../utils/logger.js");

//creating router
const router = express.Router();

//configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

//routes
// ---Upload file
router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading file", err);
        return res.status(400).json({
          message: "Multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unknown error while uploading file", err);
        return res.status(500).json({
          message: "Unknown error while uploading files",
          error: err.message,
          stack: err.stack,
        });
      } //else-if-end
      //No file in request
      if (!req.file) {
        return res.status(400).json({
          message: "No file is found",
        });
      }
      next();
    }); //upload end;
  },
  uploadMedia,
);

//---GET ALL MEDIA
router.get("/get", authenticateRequest, getAllMedia);
//---
module.exports = router;
