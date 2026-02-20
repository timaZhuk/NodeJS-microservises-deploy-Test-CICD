const express = require("express");
const {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} = require("../controllers/post-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");

const router = express.Router();

//middleware --> this will tell if an user is authenticated or not
router.use(authenticateRequest);

//--routes
//CREATE POST -- authenticateRequest add userId to request--> to createPost
router.post("/create-post", authenticateRequest, createPost);

//GET ALL POSTS
router.get("/all-posts", getAllPosts);

//GET Post
router.get("/:id", getPost);

//DELETE POst
router.delete("/:id", deletePost);

//---
module.exports = router;
