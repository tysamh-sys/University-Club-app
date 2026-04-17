const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminAuth");
const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    blockUser,
    unblockUser
} = require("../controllers/userControllers");

router.get("/", auth, getUsers);

router.get("/:id", auth, getUserById);

router.put("/:id", auth, updateUser );

router.delete("/:id", auth, deleteUser );

router.post("/:id/block", adminAuth, blockUser);

router.delete("/:id/block", adminAuth, unblockUser);

module.exports = router;