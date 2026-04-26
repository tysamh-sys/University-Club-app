const pool = require("../config/db");

// POST /chat/key
const registerPublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    const userId = req.user.id; // from auth middleware

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required" });
    }

    const query = `
      INSERT INTO public_keys (user_id, public_key)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET public_key = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, publicKey]);

    return res.status(200).json({ message: "Public key registered", key: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /chat/key/:userId
const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query("SELECT public_key FROM public_keys WHERE user_id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Public key not found for user" });
    }

    return res.status(200).json({ publicKey: result.rows[0].public_key });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /chat/messages
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, encryptedMessage, nonce } = req.body;

    if (!receiverId || !encryptedMessage || !nonce) {
      return res.status(400).json({ message: "receiverId, encryptedMessage, and nonce are required" });
    }

    const query = `
      INSERT INTO chat_messages (sender_id, receiver_id, encrypted_message, nonce)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [senderId, receiverId, encryptedMessage, nonce]);

    // 🔔 Notify Receiver
    await pool.query(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)",
      [receiverId, "New Message", `You received an encrypted message from ${req.user.name}`]
    ).catch(e => console.error("Chat notification failed:", e));

    return res.status(201).json({ message: "Message sent", data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /chat/messages/:otherUserId
const getMessages = async (req, res) => {
  try {
    const myId = req.user.id;
    const { otherUserId } = req.params;

    const query = `
      SELECT * FROM chat_messages 
      WHERE (sender_id = $1 AND receiver_id = $2) 
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY timestamp ASC;
    `;
    const result = await pool.query(query, [myId, otherUserId]);

    return res.status(200).json({ messages: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /chat/users
const getChatUsers = async (req, res) => {
  try {
    const myId = req.user.id;
    
    // Fetch all users except myself and admin
    const query = `
      SELECT u.id, u.name, u.email, u.role, p.public_key
      FROM users_tb u
      LEFT JOIN public_keys p ON u.id = p.user_id
      WHERE u.id != $1 AND u.role != 'admin'
    `;
    const result = await pool.query(query, [myId]);

    return res.status(200).json({ users: result.rows });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  registerPublicKey,
  getPublicKey,
  sendMessage,
  getMessages,
  getChatUsers
};
