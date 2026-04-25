require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const fs = require("fs");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
  let output = "";
  try {
    const res = await pool.query("DELETE FROM blocked_users WHERE user_id IN (SELECT id FROM users_tb WHERE role='admin' OR role='president') RETURNING *");
    output += "DELETED BLOCKS: " + JSON.stringify(res.rows) + "\n";
    
    const hash = await bcrypt.hash('admin123', 10);
    const email = 'admin_emergency@vital.com';
    const insertRes = await pool.query(
      "INSERT INTO users_tb (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $3 RETURNING id, email",
      ['Emergency Admin', email, hash, 'admin']
    );
    output += "EMERGENCY ADMIN: " + JSON.stringify(insertRes.rows[0]) + "\n";

    // Debug existing admins
    const admins = await pool.query("SELECT id, email, role FROM users_tb WHERE role='admin' OR role='president'");
    output += "ALL ADMINS: " + JSON.stringify(admins.rows) + "\n";
    
  } catch(e) {
    output += "ERROR: " + e.message + "\n";
  } finally {
    fs.writeFileSync("output.txt", output);
    process.exit();
  }
}
run();
