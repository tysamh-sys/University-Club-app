const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");

const {
  registerPublicKey,
  getPublicKey,
  sendMessage,
  getMessages,
  getChatUsers
} = require("../controllers/chatController");

router.post("/key", auth, registerPublicKey);
router.get("/key/:userId", auth, getPublicKey);
router.post("/message", auth, sendMessage);
router.get("/messages/:otherUserId", auth, getMessages);
router.get("/users", auth, getChatUsers);

module.exports = router;
