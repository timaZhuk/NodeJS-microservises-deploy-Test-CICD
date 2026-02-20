const express = require("express");
const { searchPostController } = require("../controllers/search-controller");
const { authenticateRequest } = require("../middleware/authMiddleware");

//---
const router = express.Router();

//---authenticate middleware
router.use(authenticateRequest);

//--routes
//search post
router.get("/posts", searchPostController);

//--
module.exports = router;
