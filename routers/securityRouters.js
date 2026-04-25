const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminAuth");
const { getLogs, getThreats, blockUserIp, unblockUserIp } = require("../controllers/securityControllers");

// Protect all security routes with admin access
router.use(adminAuth);

router.get("/logs", getLogs);
router.get("/threats", getThreats);
router.post("/block-ip", blockUserIp);
router.delete("/block-ip/:ip", unblockUserIp);

module.exports = router;
