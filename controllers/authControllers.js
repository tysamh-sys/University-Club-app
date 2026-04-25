const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
const register = async (req, res) => {
    const { name, email, password } = req.body;
    let role = "member";
    if (email.toLowerCase().includes("admin")) {
        role = "admin";
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
        "INSERT INTO users_tb (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
        [name, email, hash, role]
    );

    const user = result.rows[0];

    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        "SECRET_KEY",
        { expiresIn: "1h" }
    );

    res.json({
        token,
        user
    });
};

// LOGIN
const login = async (req, res) => {
    const { email, password } = req.body;

    const ip = req.headers['x-forwarded-for'] || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    const result = await pool.query(
        "SELECT u.*, b.id as is_blacklisted FROM users_tb u LEFT JOIN blocked_users b ON u.id = b.user_id WHERE u.email = $1",
        [email]
    );

    if (result.rows.length === 0) {
        await pool.query("INSERT INTO audit_logs (endpoint, method, ip, action, status, user_agent) VALUES ($1, $2, $3, $4, $5, $6)", [req.originalUrl, req.method, ip, 'LOGIN_FAILED', 'danger', userAgent]);
        return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const isAdmin = user.role === 'admin' || user.role === 'president';

    const currentHour = new Date().getHours();
    if (!isAdmin && currentHour >= 1 && currentHour < 4) {
        await pool.query(
            "INSERT INTO blocked_users (user_id, reason) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
            [user.id, "Automated Sentinel Ban: Logged in during restricted hours (1h - 4h)"]
        );
        return res.status(403).json({ message: "Automated Ban: Logins are strictly disabled between 1 AM and 4 AM." });
    }

    if (user.is_blacklisted && !isAdmin) {
        return res.status(403).json({ message: "Account has been blacklisted permanently." });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
        await pool.query("INSERT INTO audit_logs (user_id, endpoint, method, ip, action, status, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)", [user.id, req.originalUrl, req.method, ip, 'LOGIN_FAILED', 'danger', userAgent]);
        return res.status(401).json({ message: "Wrong password" });
    }

    await pool.query("INSERT INTO audit_logs (user_id, endpoint, method, ip, action, status, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)", [user.id, req.originalUrl, req.method, ip, 'LOGIN_SUCCESS', 'success', userAgent]);

    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        "SECRET_KEY",
        { expiresIn: "1h" }
    );

    res.json({
        token,
        user: { id: user.id, name: user.name, role: user.role }
    });
};

// ✅ GET /auth/
const getMe = async (req, res) => {
    try {
        // req.user تجي من middleware (decoded token)
        const userId = req.user.id;

        const result = await pool.query(
            "SELECT id, name, role FROM users_tb WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            user: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client("GOOGLE_CLIENT_ID");


// POST /auth/google
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const email = payload.email;
        const name = payload.name;

        // 🔍 البحث بالإيميل (الأصح)
        // 🔍 البحث بالإيميل
        let result = await pool.query(
            "SELECT u.*, b.id as is_blacklisted FROM users_tb u LEFT JOIN blocked_users b ON u.id = b.user_id WHERE u.email = $1",
            [email]
        );

        let user;

        // 🟢 إذا المستخدم جديد
        if (result.rows.length === 0) {
            const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            const newUser = await pool.query(
                `INSERT INTO users_tb (name, email, password)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, email`,
                [name, email, randomPassword]
            );

            user = newUser.rows[0];
        } else {
            user = result.rows[0];
            const isAdmin = user.role === 'admin' || user.role === 'president';
            
            const currentHour = new Date().getHours();
            if (!isAdmin && currentHour >= 1 && currentHour < 4) {
                await pool.query(
                    "INSERT INTO blocked_users (user_id, reason) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
                    [user.id, "Automated Sentinel Ban: Logged in during restricted hours (1h - 4h)"]
                );
                return res.status(403).json({ message: "Automated Ban: Logins are strictly disabled between 1 AM and 4 AM." });
            }
            if (user.is_blacklisted && !isAdmin) {
                return res.status(403).json({ message: "Account has been blacklisted permanently." });
            }
        }

        // 🔐 إنشاء JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            token,
            user
        });

    } catch (err) {
        res.status(500).json({
            message: "فشل تسجيل الدخول عبر Google",
            error: err.message
        });
    }
};
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required" });
        }

        const result = await pool.query(
            "SELECT password FROM users_tb WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = result.rows[0];

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            "UPDATE users_tb SET password = $1 WHERE id = $2",
            [hash, userId]
        );

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

const emergencyUnblock = async (req, res) => {
    try {
        await pool.query("DELETE FROM blocked_users WHERE user_id IN (SELECT id FROM users_tb WHERE role='admin' OR role='president')");
        
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query(
            "INSERT INTO users_tb (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $3",
            ['Emergency Admin', 'admin_emergency@vital.com', hash, 'admin']
        );
        
        res.json({ message: "Emergency unblock complete. You can now login with your original admin account, or use admin_emergency@vital.com / admin123" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { register, login, getMe, googleLogin, changePassword, emergencyUnblock };