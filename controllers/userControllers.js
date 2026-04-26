const pool = require("../config/db");

// CREATE
const createUser = async (req, res) => {
    try {
        const { name } = req.body;

        const result = await pool.query(
            "INSERT INTO users_tb (name) VALUES ($1) RETURNING *",
            [name]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json(err.message);
    }
};

// READ ALL
const getUsers = async (req, res) => {
    try {
        const isAdmin = req.user && req.user.role === 'admin';
        const queryStr = isAdmin 
            ? "SELECT u.id, u.name, u.email, u.role, u.created_at, (b.id IS NOT NULL AND (b.expires_at IS NULL OR b.expires_at > NOW())) as is_blacklisted FROM users_tb u LEFT JOIN blocked_users b ON u.id = b.user_id ORDER BY id ASC"
            : "SELECT id, name, role, created_at FROM users_tb ORDER BY id ASC";
            
        const result = await pool.query(queryStr);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json(err.message);
    }
};

// READ ONE
const getUserById = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await pool.query(
            "SELECT * FROM users_tb WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json(err.message);
    }
};

// update User
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;

        // user الحالي
        const currentUser = req.user;

        // ❌ user عادي يحاول يبدل user آخر
        if (currentUser.id != id && currentUser.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        // ❌ user عادي يحاول يبدل role
        if (role && currentUser.role !== "admin") {
            return res.status(403).json({ message: "Only admin can change role" });
        }

        const result = await pool.query(
            "UPDATE users_tb SET name = COALESCE($1, name), role = COALESCE($2, role) WHERE id = $3 RETURNING id, name, role",
            [name, role, id]
        );

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        // 🧠 check permissions
        if (currentUser.id != id && currentUser.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        // 🧠 نجيبو user قبل الحذف
        const userResult = await pool.query(
            "SELECT id, role FROM users_tb WHERE id = $1",
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const userToDelete = userResult.rows[0];

        // ❌ منع حذف admin (اختياري)
        if (userToDelete.role === "admin" && currentUser.role !== "admin") {
            return res.status(403).json({ message: "Cannot delete admin" });
        }

        // ❌ منع admin يحذف روحو (optional sécurité)
        if (currentUser.id == id) {
            return res.status(400).json({ message: "You cannot delete yourself" });
        }

        // 🗑️ delete
        await pool.query(
            "DELETE FROM users_tb WHERE id = $1",
            [id]
        );

        res.json({ message: "User deleted successfully" });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// BLACKLIST
const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (req.user.id == id) return res.status(400).json({message: "Cannot blacklist yourself"});
        
        // ❌ Prevent blocking an Admin
        const userRes = await pool.query("SELECT role FROM users_tb WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
        if (userRes.rows[0].role === 'admin' || userRes.rows[0].role === 'president') {
            return res.status(403).json({ message: "Admin accounts cannot be blocked." });
        }

        await pool.query(
            "INSERT INTO blocked_users (user_id, reason) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
            [id, reason || 'Admin API Blacklist']
        );
        res.json({ message: "User blacklisted successfully" });
    } catch(err) { res.status(500).json(err.message); }
}

const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM blocked_users WHERE user_id = $1", [id]);
        res.json({ message: "User removed from blacklist successfully" });
    } catch(err) { res.status(500).json(err.message); }
}

module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    blockUser,
    unblockUser
};