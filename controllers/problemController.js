const pool = require("../config/db");

// POST /problems
const createProblem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { problemText } = req.body;

    if (!problemText) {
      return res.status(400).json({ message: "problemText is required" });
    }

    const query = `
      INSERT INTO user_problems (user_id, problem_text)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, problemText]);

    return res.status(201).json({ message: "Problem reported successfully", data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /problems
const getProblems = async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM user_problems p
      JOIN users_tb u ON p.user_id = u.id
      ORDER BY p.created_at DESC;
    `;
    const result = await pool.query(query);

    return res.status(200).json({ problems: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /problems/:id/reply
const replyProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;

    if (!replyText) {
      return res.status(400).json({ message: "replyText is required" });
    }

    // 1. Update problem
    const updateQuery = `
      UPDATE user_problems
      SET reply_text = $1, is_resolved = TRUE, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [replyText, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const problem = result.rows[0];

    // 2. Create notification for user
    const notifyQuery = `
      INSERT INTO notifications (user_id, title, message)
      VALUES ($1, $2, $3)
    `;
    await pool.query(notifyQuery, [
      problem.user_id, 
      "Admin Replied to Your Feedback", 
      replyText
    ]);

    return res.status(200).json({ message: "Reply sent and user notified", data: problem });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [userId]);

    return res.status(200).json({ notifications: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createProblem,
  getProblems,
  replyProblem,
  getNotifications
};
