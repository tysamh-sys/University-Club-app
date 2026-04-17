const express = require("express");
const router = express.Router();

const { login,register,getMe,googleLogin, changePassword } = require("../controllers/authControllers");
const auth = require("../middlewares/auth");

router.post("/login", login);

router.post("/register",register);

router.get("/",getMe)

router.post("/google", googleLogin);

router.post("/change-password", auth, changePassword);

module.exports = router;