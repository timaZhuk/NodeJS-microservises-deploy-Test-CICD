require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const logger = require("./utils/logger.js");
const express = require("express");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler.js");
const mediaRoutes = require("./routes/media-routes.js");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const { rateLimit } = require("express-rate-limit");
const { consumeEvent, connectToRabbitMQ } = require("./utils/rabbitmq.js");
const {
  handlePostDeleted,
} = require("./eventHandlers/media-event-handlers.js");
//---
const { RedisStore } = require("rate-limit-redis");

//--Redis
const Redis = require("ioredis");

//--PORT
const PORT = process.env.MEDIA_SERVICE_PORT || 4003;
//----------------------------
const app = express();

//---connect to MongoDB (best practice to create separate module)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    //start logger for DB connection
    logger.info("Connected to mongodb");
  })
  .catch((error) => logger.error("Mongo connection error ", error));

//-----create a Redis client --------
const redisClient = new Redis(process.env.REDIS_URL);
//---middleware
//helmet implement security headers for protecting api
app.use(helmet());
//---
app.use(cors());
app.use(express.json());

//--logger info
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

//-POSTS IP based rate limiting for sensitive endpoints (express-rate-limit)
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // time interval
  max: 100, //mximum number of req to API
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//--apply this sensitiveEndpointLimiter to our routes
app.use("/api/media/upload", sensitiveEndpointLimiter);

//---routes to media
app.use("/api/media", mediaRoutes);

//error handler
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    //consume all events "post.deleted" and callback=handleDeleted
    await consumeEvent("post.deleted", handlePostDeleted);

    //start server
    app.listen(PORT, () => {
      logger.info(`Media Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason", reason);
});
