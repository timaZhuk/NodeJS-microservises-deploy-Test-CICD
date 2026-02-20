const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken.js");
const generateTokens = require("../utils/generateToken.js");
const logger = require("../utils/logger");
const {
  validateRegistration,
  validateLogin,
} = require("../utils/validation.js");

//--user registration SIGN UP
const registerUser = async (req, res) => {
  //start logger
  logger.info("Registration endpoint hit ...");
  try {
    //---validate the reqistration schema (data from request)
    const { error } = validateRegistration(req.body);
    if (error) {
      //log the error
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    //-----get data from request body ----
    const { email, password, username } = req.body;

    //---check if user exist in DB
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    //---save user data in Mongo DB
    //--- argon2 hashed password and this is hash string for password
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    //----generate access Token and Refresh Token
    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully, tokens created",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//--LOGIN user login
const loginUser = async (req, res) => {
  logger.info("LOGIN endpoint hit...");
  try {
    //validate req.body data
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("LOGIN Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    //--get email, password from request body
    const { email, password } = req.body;
    //get user object from Mongo DB
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("LOGIN: Invalid user");
      return res.status(400).json({
        success: false,
        message: "LOGIN: Invalid credentials",
      });
    }
    //---entered password valid or not--
    //comparePassword in User model (argon2)
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("LOGIN: Invalid credentials");
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    //---create accessToken, refreshToken
    const { accessToken, refreshToken } = await generateTokens(user);
    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("LOGIN error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//REFRESH refresh token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token is missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");

      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    //delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh Token error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//--LOGOUT
const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    //pass refreshToken from request body
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token is missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    //---delete refreshToken
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Error while logging out", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//---
module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
