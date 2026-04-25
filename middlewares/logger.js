const pool = require("../config/db");

const logger = (req, res, next) => {
  if (!global.logs) global.logs = [];

  const ip = req.headers['x-forwarded-for'] || req.ip;
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - IP: ${ip}`);

  const userId = req.user ? req.user.id : null;

  global.logs.push({
    ip: ip,
    userId: userId,
    endpoint: req.originalUrl,
    method: req.method,
    time: new Date()
  });

  // Save to DB asynchronously so it doesn't block the request
  pool.query(
    "INSERT INTO audit_logs (user_id, endpoint, method, ip, action, status, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [userId, req.originalUrl, req.method, ip, 'API_CALL', 'success', userAgent]
  ).catch(err => console.error("Error saving audit log:", err.message));

  next();
};

module.exports = logger;