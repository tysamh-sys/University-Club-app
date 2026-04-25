const pool = require("../config/db");

// Fetch logs
const getLogs = async (req, res) => {
    try {
        const { userId } = req.query;
        let query = `
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users_tb u ON a.user_id = u.id
        `;
        const params = [];
        if (userId) {
            query += " WHERE a.user_id = $1";
            params.push(userId);
        }
        query += " ORDER BY a.created_at DESC LIMIT 50";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Fetch active threats
const getThreats = async (req, res) => {
    try {
        // 1. Get blocked users and IPs
        const blockedRes = await pool.query(`
            SELECT b.*, u.name, u.email 
            FROM blocked_users b
            LEFT JOIN users_tb u ON b.user_id = u.id
            ORDER BY b.created_at DESC
        `);

        // 2. Get suspicious IPs (e.g. IPs with >= 3 failed logins in last 24 hours that are NOT blocked yet)
        const suspiciousRes = await pool.query(`
            SELECT ip as ip_address, count(*) as fail_count, MAX(created_at) as last_attempt
            FROM audit_logs
            WHERE action = 'LOGIN_FAILED'
              AND ip IS NOT NULL
              AND ip NOT IN (SELECT ip_address FROM blocked_users WHERE ip_address IS NOT NULL)
            GROUP BY ip
            HAVING count(*) >= 3
            ORDER BY fail_count DESC
            LIMIT 10
        `);

        res.json({
            blocked: blockedRes.rows,
            suspicious: suspiciousRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Block an IP explicitly
const blockUserIp = async (req, res) => {
    try {
        const { ip, reason } = req.body;
        if (!ip) return res.status(400).json({ message: "IP address is required" });

        await pool.query(
            "INSERT INTO blocked_users (ip_address, reason) VALUES ($1, $2) ON CONFLICT (ip_address) DO UPDATE SET reason = $2",
            [ip, reason || 'Suspicious Activity manually blocked']
        );
        res.json({ message: "IP Blocked successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Unblock an IP
const unblockUserIp = async (req, res) => {
    try {
        const { ip } = req.params;
        await pool.query("DELETE FROM blocked_users WHERE ip_address = $1", [ip]);
        res.json({ message: "IP Unblocked successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getLogs,
    getThreats,
    blockUserIp,
    unblockUserIp
};
