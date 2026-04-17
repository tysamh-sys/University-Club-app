require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log("Connected to Remote Render DB...");

        // Seed Users
        const users = [
          { name: "Ahmed Ben Salem", email: "ahmed.bensalem@issatkr.tn", role: "President" },
          { name: "Fatima Trabelsi", email: "fatima.trabelsi@issatkr.tn", role: "Vice President" }
        ];

        for (const u of users) {
            await pool.query(
                `INSERT INTO users_tb (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
                [u.name, u.email, 'hashed_mock_password', u.role]
            );
        }
        console.log("✅ Seeded Users");

        // Seed Events
        const events = [
          { title: "React Advanced Workshop", desc: "Learn advanced React Native architectures.", date: new Date("2026-04-25T14:00:00Z") },
          { title: "Spring Hackathon 2026", desc: "Annual 48-hour hackathon.", date: new Date("2026-05-05T09:00:00Z") },
          { title: "AI & Sustainability Tech Talk", desc: "Applying AI to eco-friendly problems.", date: new Date("2026-05-15T18:00:00Z") }
        ];

        for (const ev of events) {
            // Note: Schema has created_by INTEGER
            await pool.query(
                `INSERT INTO events (title, description, date, created_by) VALUES ($1, $2, $3, $4)`,
                [ev.title, ev.desc, ev.date, 1]
            );
        }
        console.log("✅ Seeded Events");

    } catch (err) {
        console.error("❌ Seed Error:", err);
    } finally {
        pool.end();
    }
}

seed();
