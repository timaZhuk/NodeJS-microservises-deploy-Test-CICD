const logger = require("../utils/logger.js");
const jwt = require("jsonwebtoken");

//-----------------------------------
const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  //header = Bearer RGdf!4554sfsjkFJHKJ
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("API-> POSTS: Access attempt without token");
    return res.status(401).json({
      success: false,
      message: "API -> PPSTS: Authentication required",
    });
  }

  //---verify the Token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      logger.warn("Invalid token");
      return res.status(429).json({
        success: false,
        message: "Invalid token",
      });
    }
    //--(decoded token payload) add user to request
    req.user = user;
    next();
  });
};

//---
module.exports = { validateToken };
