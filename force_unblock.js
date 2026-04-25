const pool = require('./config/db');

async function forceUnblock() {
  try {
    const res = await pool.query("DELETE FROM blocked_users");
    console.log(`✅ Cleared blocked_users table. Removed ${res.rowCount} entries.`);
    
    const admins = await pool.query("SELECT email FROM users_tb WHERE role = 'admin'");
    console.log("Current admins:", admins.rows.map(r => r.email));

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

forceUnblock();
