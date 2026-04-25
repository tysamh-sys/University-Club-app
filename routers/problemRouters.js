const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminAuth");

const {
  createProblem,
  getProblems,
  replyProblem,
  getNotifications
} = require("../controllers/problemController");

router.post("/", auth, createProblem);
router.get("/", adminAuth, getProblems);
router.post("/:id/reply", adminAuth, replyProblem);
router.get("/notifications", auth, getNotifications);

module.exports = router;
