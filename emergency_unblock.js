const pool = require('./config/db');

async function debugAndUnblock() {
  try {
    // 1. List all admins
    const admins = await pool.query("SELECT id, name, email, role FROM users_tb WHERE role = 'admin' OR role = 'president'");
    console.log("Admins in database:", admins.rows);

    // 2. List all blocked users
    const blocked = await pool.query("SELECT * FROM blocked_users");
    console.log("Blocked users in database:", blocked.rows);

    // 3. Definitively delete all admins from blocked_users
    const unblockRes = await pool.query(`
      DELETE FROM blocked_users 
      WHERE user_id IN (
        SELECT id FROM users_tb 
        WHERE role = 'admin' OR role = 'president'
      )
    `);
    console.log(`✅ Unblocked ${unblockRes.rowCount} admin accounts.`);

    // 4. If no admin exists, create a new emergency one
    if (admins.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('admin123', 10);
      const newAdmin = await pool.query(
        "INSERT INTO users_tb (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
        ['Emergency Admin', 'emergency@admin.com', hash, 'admin']
      );
      console.log("🚨 Created new emergency admin:", newAdmin.rows[0], "Password: admin123");
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error in debugAndUnblock:', err);
    process.exit(1);
  }
}

debugAndUnblock();
