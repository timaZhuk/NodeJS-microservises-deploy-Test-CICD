const logger = require("../utils/logger");
const Post = require("../models/Post.js");
const { validateCreatePost } = require("../utils/validation.js");
const { publishEvent } = require("../utils/rabbitmq.js");

//---INVALIDATE CACHE-----
//remove posts from cache (not overuse Redis and memory)
//invalidateCahce: by key === `posts:${page}:${limit}`
async function invalidatePostCache(req, input) {
  //find all keys with "posts:..."
  const keys = await req.redisClient.keys("posts:*");

  //delete all data with this keys
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
  //functionality to delete post by id==input = req.post_id
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
}

//---CREATE POST---
const createPost = async (req, res) => {
  logger.info("CREATE POST endpoint hit ...");
  try {
    //validate the schema
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("POST data validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // -- get content, mediaIds from request body
    const { content, mediaIds } = req.body;

    //creating post in DB and save it
    //userId from middleware func that connects Post Service with Identity Service
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();
    //---Publish event through the RabbitMQ
    //Creating post--> event=="post.created"--> Search Service-->"search event handler"
    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    //implement INVALIDATE CHACHE (delete cache posts in Redis)
    //when we create a new Post
    await invalidatePostCache(req, newlyCreatedPost._id.toString());

    logger.info("CREATE POST: Post created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "CREATE POST: Post created successfully",
    });
  } catch (error) {
    logger.error("CREATE POST: Error creating post", error);
    res.status(500).json({
      success: false,
      message: "CREATE POST: Error creating post",
    });
  }
};

//---GET ALL POSTS----
const getAllPosts = async (req, res) => {
  try {
    //start with counting page number and post quantity on the page
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    //start with post[startIndex]
    const startIndex = (page - 1) * limit;
    //--creating a key for Redis client (that was sent with req.body in the server.js)
    const cacheKey = `posts:${page}:${limit}`;
    //fetch data from Redis DB if it would exists
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }
    //--otherwise: get from MongoDB
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    //--get total number of Posts in DB
    const totalNoOfPosts = await Post.countDocuments();
    const result = {
      posts,
      currentpage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };
    //save your posts in Redis cache
    //setex(keys, time(sec), object)
    //after 300sec all posts will be deleted from  cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error("GET ALL POST: Error in fetching all posts", error);
    res.status(500).json({
      success: false,
      message: "GET ALL POST: Error in fetching all posts",
    });
  }
};

//---GET  POST----
const getPost = async (req, res) => {
  try {
    // -- get post if from params
    const postId = req.params.id;
    //--creating key for Redis
    const cachedkey = `post:${postId}`;
    //--get the post from Redis
    const cachedPost = await req.redisClient.get(cachedkey);

    //if it exists in redis --> send to client
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    //otherwise get post from mongoDB
    const singlePostDetailsbyId = await Post.findById(postId);
    if (!singlePostDetailsbyId) {
      return res.status(404).json({
        success: false,
        message: "GET POST: Post not found",
      });
    }
    //-save your post in Redis cache
    //--setex(keys, time(sec), object)
    //after 3600 sec post will be deleted from cache
    await req.redisClient.setex(
      cachedkey,
      3600,
      JSON.stringify(singlePostDetailsbyId),
    );

    res.json(singlePostDetailsbyId);
  } catch (error) {
    logger.error("GET POST: Error in getting post", error);
    res.status(500).json({
      success: false,
      message: "GET POST: Error in getting post",
    });
  }
};

//---DELETE  POST----
//Publish event to Media Service to delete media files (throug message broker
// RabbitMQ)
const deletePost = async (req, res) => {
  try {
    //-get post id from request params
    const postId = req.params.id;
    //delete post from DB
    const post = await Post.findOneAndDelete({
      _id: postId,
      user: req.user.userId,
    });

    //if post not found in DB
    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    //--PUBLISH Event (RabbitMQ) deleting methods --> to Media Service
    //---to SEARCH SERVICE also
    //message={obkect of Post}
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    //--clean the Redis cache (after deleteng post)
    await invalidatePostCache(req, postId);

    res.json({
      message: "Post successfully deleted",
    });
  } catch (error) {
    logger.error("GET POST: Error in deleting post", error);
    res.status(500).json({
      success: false,
      message: "GET POST: Error in deleting post",
    });
  }
};

//---
module.exports = { createPost, getAllPosts, getPost, deletePost };
