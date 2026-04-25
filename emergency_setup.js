const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function createEmergencyAdmin() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    const email = 'admin_emergency@vital.com';
    
    // 1. Delete all blocks just in case
    await pool.query("DELETE FROM blocked_users");
    
    // 2. Insert new admin
    const res = await pool.query(
      "INSERT INTO users_tb (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $3 RETURNING id, email",
      ['Emergency Admin', email, hash, 'admin']
    );
    
    console.log("✅ Emergency Admin Ready:", res.rows[0].email);
    console.log("Password is: admin123");
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

createEmergencyAdmin();
