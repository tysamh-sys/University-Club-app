// Standalone seed — no require("./config/db"), direct pg connection with timeout
const { readExcelFile } = require("./services/excelService");
const { Pool } = require("pg");

const DB_URL = process.env.DATABASE_URL || "postgresql://sameh_db_user:11JvNI0TBYVYiSsgh3gWGaVx5QkGqyDR@dpg-d7hl4c7avr4c73f4riag-a.ohio-postgres.render.com/sameh_db";

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

const seed = async () => {
  let client;
  try {
    console.log("Connecting to:", DB_URL.split("@")[1]); // show only host
    client = await pool.connect();
    console.log("✅ Connected!");

    const data = readExcelFile("./data/dataset.xlsx");
    console.log(`📖 Read ${data.length} rows from Excel.`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS historical_events (
        event_id INTEGER PRIMARY KEY,
        event_name VARCHAR(255),
        category VARCHAR(100),
        event_date VARCHAR(255),
        location VARCHAR(255),
        participants INT,
        budget_tnd FLOAT,
        revenue_tnd FLOAT,
        main_issue VARCHAR(255),
        secondary_issue VARCHAR(255),
        satisfaction_score FLOAT
      );
    `);
    console.log("📋 Table ready.");

    const CHUNK_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const values = [];
      const placeholders = chunk.map((row, j) => {
        const base = j * 11;
        values.push(
          row.Event_ID, row.Event_Name, row.Category, row.Date,
          row.Location, row.Participants, row.Budget_TND,
          row.Revenue_TND, row.Main_Issue, row.Secondary_Issue,
          row.Satisfaction_Score
        );
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11})`;
      }).join(", ");

      await client.query(
        `INSERT INTO historical_events 
         (event_id, event_name, category, event_date, location, participants, budget_tnd, revenue_tnd, main_issue, secondary_issue, satisfaction_score) 
         VALUES ${placeholders}
         ON CONFLICT (event_id) DO NOTHING;`,
        values
      );

      inserted += chunk.length;
      console.log(`  ↳ ${inserted}/${data.length} rows inserted`);
    }

    console.log(`\n🎉 Seeding complete! ${inserted} rows in historical_events.`);
  } catch (e) {
    console.error("❌ Seed failed:", e.message);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
};

seed();
