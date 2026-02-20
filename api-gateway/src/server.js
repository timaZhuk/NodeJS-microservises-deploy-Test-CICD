require("dotenv").config();
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");

//--ratelimiting imports
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
//--import for PROXY
const proxy = require("express-http-proxy");

//---CONSTANTS-----
const PORT = process.env.PORT || 4000;
const IDENTITY_SERVICE_PORT = process.env.IDENTITY_SERVICE_PORT || 4001;
const POST_SERVICE_PORT = process.env.POST_SERVICE_PORT || 4002;
const MEDIA_SERVICE_PORT = process.env.MEDIA_SERVICE_PORT || 4003;
const SEARCH_SERVICE_PORT = process.env.SEARCH_SERVICE_PORT || 4004;

const IDENTITY_SERVICE_URL =
  process.env.IDENTITY_SERVICE_URL || "http://localhost:4001";

const POST_SERVICE_URL =
  process.env.POST_SERVICE_URL || "http://localhost:4002";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://localhost:4003";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:4004";

//-----------
const REDIS_URL = process.env.REDIS_URL;
const version = "v1";

//----create express app
const app = express();

//client IORedis
const redisClient = new Redis(process.env.REDIS_URL);

//use middleware
app.use(helmet());

app.use(cors());
app.use(express.json());

//Info logging middleware
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

//IP base rate limiting for sensitive endpoints
const rateLimitOptions = rateLimit({
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

app.use(rateLimitOptions);

//----------CREATE A PROXY
//api-gateway http://localhost:4000/v1/auth/register --->
//--> identity service -- http://localhost:4001/api/auth/register
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    //replace /v1/auth/register to /api/auth/register
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
};

//--------------IDENTITY SERVICE-----------
//setting up proxy for IDENTITY SERVICE
//targeting --> IDENTITY_SERVICE_URL = http://localhost:4001
app.use(
  `/${version}/auth`,
  proxy(IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from IDENTITY SERVICE: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);

//-----------------POSTS SERVICE-----------------------
//validateToken -> get from req.headers["authorization"]-->access Token--->add req.user=user
//"userId" field in accessToken in Identity Service refreshToken model
app.use(
  `/${version}/posts`,
  validateToken,
  proxy(POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      //headers["x-user-id"] --> in POST SERVICE: authMiddleware read this header
      //and retrieve userId
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; //add header
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from POST SERVICE: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);

//-----MEDIA SERVICE--------------------------------
//validateToken --> get from req.headers["authorization"]--> access Token-->
//->add req.user.userId send it by req.headers["x-user-id"]
app.use(
  `/${version}/media`,
  validateToken,
  proxy(MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      //add userId to headers
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
    //req body is proxied for the file uploads
    parseReqBody: false,
  }),
);

//-----------------SEARCH SERVICE-----------------------
//validateToken -> get from req.headers["authorization"]-->access Token--->add req.user=user
//"userId" field in accessToken in Identity Service refreshToken model
app.use(
  `/${version}/search`,
  validateToken,
  proxy(SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      //headers["x-user-id"] --> in SEARCH SERVICE: authMiddleware read this header
      //and retrieve userId
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; //add header
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from SEARCH SERVICE: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);

//-------------------
//error handler
app.use(errorHandler);

//--create server connection
app.listen(PORT, () => {
  logger.info(`API Gateway service running on port ${PORT}`);
  logger.info(`Identity Service is running on port ${IDENTITY_SERVICE_PORT}`);
  logger.info(`POST Service is running on port${POST_SERVICE_PORT}`);
  logger.info(`Media Service is running on port${MEDIA_SERVICE_PORT}`);
  logger.info(`SEARCH Service is running on port${SEARCH_SERVICE_PORT}`);
  logger.info(`Redis URL: ${REDIS_URL}`);
});
