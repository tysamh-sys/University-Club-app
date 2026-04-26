const pool = require("../config/db");

const blockUserMiddleware = async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    
    // Ignore internal requests or localhost to prevent self-lockout during dev if not careful
    if (ip === '127.0.0.1' || ip === '::1') return next();

    const result = await pool.query("SELECT * FROM blocked_users WHERE ip_address = $1 AND (expires_at IS NULL OR expires_at > NOW())", [ip]);
    
    if (result.rows.length > 0) {
      return res.status(403).json({ message: "🚫 Your IP has been blocked by Sentinelle." });
    }

    return next();
  } catch (err) {
    next();
  }
};

module.exports = blockUserMiddleware;