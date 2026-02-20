const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken.js");

//---function generate Access and Refresh Tokens
const generateTokens = async (user) => {
  //---access Token
  const accessToken = jwt.sign(
    {
      userId: user._id,
      username: user.name,
    },

    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "60m", //max = 10-15 min in real life
    },
  );
  //---refreshToken for updating AccessToken
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); //refresh token expires in 7 days

  //save refreshToken in DB
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

//---
module.exports = generateTokens;
