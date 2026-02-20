const express = require("express");
const {
  registerUser,
  loginUser,
  refreshTokenUser,
  logoutUser,
} = require("../controllers/identity-controller");

const router = express.Router();

//---routes

//-SIGN UP
router.post("/register", registerUser);
//-LOGIN
router.post("/login", loginUser);
//RefreshToken
router.post("/refresh-token", refreshTokenUser);
//--LogOUT
router.post("/logout", logoutUser);
//--
module.exports = router;
