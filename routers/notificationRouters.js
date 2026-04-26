const express = require("express");
const router = express.Router();
const { getNotifications, markAsRead } = require("../controllers/notificationController");
const auth = require("../middlewares/auth");

router.get("/", auth, getNotifications);
router.put("/:id/read", auth, markAsRead);

module.exports = router;
