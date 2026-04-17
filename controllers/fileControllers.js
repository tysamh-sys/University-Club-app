const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("../config/db");
const { encryptFileStream, decryptFileStream } = require("../services/cryptoService");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { originalname, size, path: tempPath, mimetype } = req.file;
    const { access_role } = req.body;
    
    // Encrypt file
    const encryptedFileName = crypto.randomUUID() + ".enc";
    const encryptedPath = path.join(__dirname, "../vault/encrypted", encryptedFileName);
    
    const { iv, authTag } = await encryptFileStream(tempPath, encryptedPath);
    
    // Remove temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    
    // Store in DB
    const insertQuery = `
      INSERT INTO files (file_name, file_type, file_size, file_path, uploaded_by, access_role, encryption_iv)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING file_id;
    `;
    const ivStorage = `${iv}:${authTag}`; // Combine IV and AuthTag
    
    const result = await pool.query(insertQuery, [
      originalname,
      mimetype,
      size,
      encryptedFileName,
      req.user ? req.user.id : null,
      access_role || 'admin',
      ivStorage
    ]);
    
    const fileId = result.rows[0].file_id;
    
    // Log audit
    if (req.user) {
        await pool.query(`INSERT INTO file_audit_logs (file_id, user_id, action, ip_address) VALUES ($1, $2, 'UPLOAD', $3)`, [fileId, req.user.id, req.ip]);
    }

    return res.status(201).json({
      message: "File uploaded and encrypted successfully",
      file_id: fileId
    });

  } catch (error) {
    return res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

const listFiles = async (req, res) => {
  try {
    const role = req.user ? req.user.role : null;
    let query = `SELECT file_id, file_name, file_type, file_size, uploaded_by, access_role, uploaded_at FROM files`;
    
    if (role !== 'admin') {
      query += ` WHERE access_role = 'member' OR access_role = 'public'`;
    }
    
    query += ` ORDER BY uploaded_at DESC`;
    
    const result = await pool.query(query);
    return res.json({ count: result.rows.length, files: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list files", error: error.message });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check DB
    const result = await pool.query(`SELECT * FROM files WHERE file_id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "File not found" });
    
    const file = result.rows[0];
    
    // RBAC check
    if (file.access_role === 'admin' && (!req.user || req.user.role !== 'admin')) {
       if (req.user) {
         await pool.query(`INSERT INTO file_audit_logs (file_id, user_id, action, ip_address) VALUES ($1, $2, 'UNAUTHORIZED_ATTEMPT', $3)`, [id, req.user.id, req.ip]);
       }
       return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    // Safe download log
    if (req.user) {
      await pool.query(`INSERT INTO file_audit_logs (file_id, user_id, action, ip_address) VALUES ($1, $2, 'DOWNLOAD', $3)`, [id, req.user.id, req.ip]);
    }

    const encryptedPath = path.join(__dirname, "../vault/encrypted", file.file_path);
    if (!fs.existsSync(encryptedPath)) return res.status(404).json({ message: "Encrypted file missing from vault" });
    
    const parts = file.encryption_iv.split(":");
    if (parts.length < 2) return res.status(500).json({ message: "Invalid encryption signature stored" });
    const [iv, authTag] = parts;
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Type', file.file_type);
    
    await decryptFileStream(encryptedPath, res, iv, authTag);

  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ message: "Download failed or Corrupted payload", error: error.message });
    }
  }
};

const deleteFile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden context" });
    const { id } = req.params;
    
    const result = await pool.query(`SELECT file_path FROM files WHERE file_id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    
    const filePath = path.join(__dirname, "../vault/encrypted", result.rows[0].file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    await pool.query(`DELETE FROM files WHERE file_id = $1`, [id]);
    await pool.query(`INSERT INTO file_audit_logs (file_id, user_id, action, ip_address) VALUES ($1, $2, 'DELETE', $3)`, [id, req.user.id, req.ip]);
    
    res.json({ message: "File securely deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

module.exports = { uploadFile, listFiles, downloadFile, deleteFile };
