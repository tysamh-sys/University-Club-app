const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middlewares/auth");

const {
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile
} = require("../controllers/fileControllers");

// Ensure temp directory exists
const tempDir = path.join(__dirname, "../vault/temp");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Multer generic temp storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
});

// Routes
router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/", auth, listFiles);
router.get("/:id/download", auth, downloadFile);
router.delete("/:id", auth, deleteFile);

module.exports = router;
