const pool = require("../config/db");
const { notifyAdmins } = require("../services/notificationService");

// POST /api/events
const createEvent = async (req, res) => {
    try {
        const { title, description, date, location, budget } = req.body;

        const userId = req.user.id; // من JWT middleware

        // 🧠 validation بسيطة
        if (!title || !date) {
            return res.status(400).json({
                message: "title and date are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO events 
            (title, description, date, location, budget, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [title, description, date, location, budget, userId]
        );

        res.status(201).json({
            message: "Event created successfully",
            event: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// GET /api/events
const getEvents = async (req, res) => {
    try {
        const { date, created_by } = req.query;

        let query = `
            SELECT 
                e.*,
                u.name AS creator_name
            FROM events e
            JOIN users_tb u ON e.created_by = u.id
            WHERE (e.is_archived = FALSE OR e.is_archived IS NULL)
        `;

        const values = [];
        let index = 1;

        // 🧠 filter by date
        if (date) {
            query += ` AND e.date = $${index}`;
            values.push(date);
            index++;
        }

        // 🧠 filter by creator
        if (created_by) {
            query += ` AND e.created_by = $${index}`;
            values.push(created_by);
            index++;
        }

        // 🧠 pagination
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        query += ` ORDER BY e.date ASC LIMIT $${index} OFFSET $${index + 1}`;
        values.push(limit, offset);

        const result = await pool.query(query, values);

        res.json({
            count: result.rows.length,
            events: result.rows
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// GET /api/events/:id
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT 
                e.*,
                u.name AS creator_name,
                u.id AS creator_id
            FROM events e
            JOIN users_tb u ON e.created_by = u.id
            WHERE e.id = $1
            `,
            [id]
        );

        // ❌ event not found
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        res.json({
            event: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// PUT /api/events/:id
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, date, location, budget } = req.body;

        // 🧠 نجيب event الحالي
        const eventResult = await pool.query(
            "SELECT * FROM events WHERE id = $1",
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        const event = eventResult.rows[0];

        const user = req.user;

        // 🔐 permissions check
        const isCreator = event.created_by === user.id;
        const isAdmin = user.role === "admin" || user.role === "president";

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                message: "You are not allowed to update this event"
            });
        }

        // 🛠️ update query (dynamic safe update)
        const result = await pool.query(
            `
            UPDATE events
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                date = COALESCE($3, date),
                location = COALESCE($4, location),
                budget = COALESCE($5, budget)
            WHERE id = $6
            RETURNING *
            `,
            [title, description, date, location, budget, id]
        );

        res.json({
            message: "Event updated successfully",
            event: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// DELETE /events/:id
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // 🧠 check if event exists
        const eventResult = await pool.query(
            "SELECT * FROM events WHERE id = $1",
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const event = eventResult.rows[0];
        const user = req.user;

        // 🔐 permissions
        const isCreator = event.created_by === user.id;
        const isAdmin = user.role === "admin" || user.role === "president";

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                message: "You are not allowed to delete this event"
            });
        }

        // 🗑️ delete event
        await pool.query(
            "DELETE FROM events WHERE id = $1",
            [id]
        );

        res.json({
            message: "Event deleted successfully"
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// GET /api/events/archived
const getArchivedEvents = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== "admin" && user.role !== "president") {
            return res.status(403).json({ message: "Access denied" });
        }

        const query = `
            SELECT 
                e.*,
                u.name AS creator_name
            FROM events e
            JOIN users_tb u ON e.created_by = u.id
            WHERE e.is_archived = TRUE
            ORDER BY e.date ASC
        `;
        const result = await pool.query(query);

        res.json({
            count: result.rows.length,
            events: result.rows
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// PUT /api/events/:id/archive
const archiveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (user.role !== "admin" && user.role !== "president") {
            return res.status(403).json({ message: "Only admins can archive events" });
        }

        const result = await pool.query(
            "UPDATE events SET is_archived = TRUE WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({ message: "Event archived successfully", event: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// PUT /api/events/:id/restore
const restoreEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (user.role !== "admin" && user.role !== "president") {
            return res.status(403).json({ message: "Only admins can restore events" });
        }

        const result = await pool.query(
            "UPDATE events SET is_archived = FALSE WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({ message: "Event restored successfully", event: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// 🎫 PARTICIPATION LOGIC
const requestParticipation = async (req, res) => {
  try {
    const event_id = parseInt(req.params.id);
    const user_id = req.user.id;
    const { message } = req.body;

    if (isNaN(event_id)) {
        return res.status(400).json({ message: "Invalid Event ID format" });
    }

    console.log(`Processing participation request: User ${user_id} -> Event ${event_id}`);

    const query = `
      INSERT INTO participation_requests (user_id, event_id, message)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    let result;
    try {
        result = await pool.query(query, [user_id, event_id, message || '']);
    } catch (dbErr) {
        if (dbErr.message.includes('relation "participation_requests" does not exist')) {
            console.log("Healing DB: Creating participation_requests table...");
            await pool.query(`
                CREATE TABLE IF NOT EXISTS participation_requests (
                    request_id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
                    event_id INT REFERENCES events(id) ON DELETE CASCADE,
                    message TEXT,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, event_id)
                );
            `);
            result = await pool.query(query, [user_id, event_id, message || '']);
        } else {
            throw dbErr;
        }
    }
    res.status(201).json({ message: "Participation requested", request: result.rows[0] });

    // 🔔 Notify Admins
    try {
        const userResult = await pool.query("SELECT name FROM users_tb WHERE id = $1", [user_id]);
        const eventResult = await pool.query("SELECT title FROM events WHERE id = $1", [event_id]);
        const userName = userResult.rows[0]?.name || "A member";
        const eventTitle = eventResult.rows[0]?.title || "an event";
        
        await notifyAdmins(
            "New Join Request",
            `${userName} wants to participate in: ${eventTitle}`
        );
    } catch (err) { console.error("Notification trigger failed:", err.message); }
  } catch (error) {
    console.error("PARTICIPATION REQUEST ERROR:", error);
    if (error.code === '23505') { 
      return res.status(400).json({ message: "You have already requested to join this event." });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getEventRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const event_id = req.params.id;

    const query = `
      SELECT r.*, u.name as user_name, u.role as user_role, u.email as user_email
      FROM participation_requests r
      JOIN users_tb u ON r.user_id = u.id
      WHERE r.event_id = $1
      ORDER BY r.created_at DESC;
    `;
    const result = await pool.query(query, [event_id]);
    res.json({ requests: result.rows });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const approveRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const request_id = req.params.id;
    const query = `UPDATE participation_requests SET status = 'approved', updated_at = NOW() WHERE request_id = $1 RETURNING *`;
    const result = await pool.query(query, [request_id]);
    res.json({ message: "Approved", request: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const request_id = req.params.id;
    const query = `UPDATE participation_requests SET status = 'rejected', updated_at = NOW() WHERE request_id = $1 RETURNING *`;
    const result = await pool.query(query, [request_id]);
    res.json({ message: "Rejected", request: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getArchivedEvents,
  archiveEvent,
  restoreEvent,
  requestParticipation,
  getEventRequests,
  approveRequest,
  rejectRequest
};