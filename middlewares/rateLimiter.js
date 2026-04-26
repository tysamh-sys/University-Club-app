const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const requestTracker = {};

const rateLimiter = async (req, res, next) => {
    let userId = null;
    let userRole = null;
    
    // Attempt extracting the authorized user ID dynamically
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        const token = req.headers.authorization.split(" ")[1];
        try {
            const decoded = jwt.verify(token, "SECRET_KEY");
            if (decoded && decoded.id) {
                userId = decoded.id;
                userRole = decoded.role;
            }
        } catch(e) {
            // Ignore invalid tokens
        }
    }

    // Skip if they are completely anonymous
    if (!userId) {
        return next(); 
    }

    const now = Date.now();
    if (!requestTracker[userId]) {
        requestTracker[userId] = [];
    }

    // Filter array to keep only events fired strictly within the last sliding second
    requestTracker[userId] = requestTracker[userId].filter(timestamp => now - timestamp <= 1000);
    requestTracker[userId].push(now);

    if (requestTracker[userId].length >= 10) {
        console.warn(`🛑 [Sentinel] Rate limiter blocking User ${userId} (Traffic: ${requestTracker[userId].length} req/s)`);
        
        const isAdmin = userRole === 'admin' || userRole === 'president';

        if (!isAdmin) {
            await pool.query(
                "INSERT INTO blocked_users (user_id, reason, expires_at) VALUES ($1, $2, NOW() + INTERVAL '2 hours') ON CONFLICT (user_id) DO UPDATE SET reason = $2, expires_at = NOW() + INTERVAL '2 hours' WHERE blocked_users.expires_at IS NOT NULL",
                [userId, "Automated Sentinel Ban: Exceeded DDoS protection threshold (>10 requests/s)"]
            );
            await pool.query(
                "INSERT INTO audit_logs (user_id, endpoint, method, ip, action, status, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
                [userId, req.originalUrl, req.method, req.ip || 'System', 'AUTO_BLOCK_USER', 'danger', req.headers ? req.headers['user-agent'] : 'System']
            );
            return res.status(403).json({ message: "Automated Ban: Rate limit exceeded. Blocked for 2 hours." });
        } else {
            console.warn(`⚠️ [Sentinel] Admin ${userId} exceeded rate limit but was not blocked.`);
        }
    }

    next();
};

module.exports = rateLimiter;
