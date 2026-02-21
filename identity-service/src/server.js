require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const logger = require("./utils/logger.js");
const express = require("express");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler.js");
const authRouter = require("./routes/identity-service.js");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const { rateLimit } = require("express-rate-limit");
//---
const { RedisStore } = require("rate-limit-redis");

//--Redis
const Redis = require("ioredis");

//--PORT
const PORT = process.env.IDENTITY_SERVICE_PORT || 4001;

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

//--DDoS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // store for current client session
  keyPrefix: "middleware", // "key" in Redis DB to distinguish data from other module
  points: 10, //request in amount of time (duration)
  duration: 1, //1 second interval
});

app.use((req, res, next) => {
  //get request form client ip-address
  //if error: logger.error sends response
  //status 429 too many requests
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit is exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//-IP based rate limiting for sensitive endpoints (express-rate-limit)
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // time interval
  max: 50, //mximum number of req to API
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
app.use("/api/auth/register", sensitiveEndpointLimiter);

//Routes
app.use("/api/auth", authRouter);

//error handler
app.use(errorHandler);

//--create server connection
app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at, ", promise, "reason: ", reason);
});
