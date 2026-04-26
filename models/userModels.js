const pool = require("../config/db");

const createTable = async () => {
  try {
    // 👤 USERS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users_tb (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        push_token TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE users_tb ADD COLUMN IF NOT EXISTS push_token TEXT;
    `);

    // 🚫 BLOCKED USERS (Sentinelle)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        reason TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      );
      ALTER TABLE blocked_users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    `);

    // 🌐 IP BLACKLIST
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        ip_address VARCHAR(45) PRIMARY KEY,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 📅 EVENTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        location VARCHAR(255),
        budget DECIMAL(10, 2),
        created_by INT REFERENCES users_tb(id),
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE events ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
    `);

    // 🤝 SPONSORS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        contact_person VARCHAR(100),
        email VARCHAR(100),
        status VARCHAR(50) DEFAULT 'potential',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 📂 SECURE VAULT FILES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        file_id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INT,
        file_path TEXT NOT NULL,
        uploaded_by INT REFERENCES users_tb(id),
        access_role VARCHAR(50) DEFAULT 'admin',
        encryption_iv TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🛡️ FILE AUDIT LOGS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_audit_logs (
        log_id SERIAL PRIMARY KEY,
        file_id INT REFERENCES files(file_id) ON DELETE CASCADE,
        user_id INT REFERENCES users_tb(id),
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🏆 PARTICIPATION REQUESTS
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

    // 📊 LOGS (Sentinelle brain)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint TEXT,
        method TEXT,
        ip TEXT,
        action VARCHAR(50),
        status VARCHAR(20),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
    `).catch(() => {});

    // 💬 CHAT MESSAGES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
        receiver_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
        encrypted_message TEXT NOT NULL,
        nonce TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🔔 NOTIFICATIONS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🔑 PUBLIC KEYS FOR E2EE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_keys (
        user_id INT PRIMARY KEY REFERENCES users_tb(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL
      );
    `);

    // ⚠️ USER PROBLEMS (Feedback)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_problems (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
        problem_text TEXT NOT NULL,
        reply_text TEXT,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🔔 NOTIFICATIONS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users_tb(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 👑 SEED ADMIN ACCOUNT
    await pool.query(`
      INSERT INTO users_tb (name, email, password, role)
      VALUES ('System Admin', 'admin@university.club', '$2b$10$7R799y1EGUd89g6oOOsRreYSHi2zNw13RzTSCo8UoENl9OqPnM9Xa', 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin';
    `);

    console.log("✅ ALL TABLES CREATED AND ADMIN SEEDED SUCCESSFULLY");

  } catch (error) {
    console.error("❌ DB ERROR:", error.message);
  }
};

module.exports = { createTable };