require("dotenv").config();
const { readExcelFile } = require("./services/excelService");
const pool = require("./config/db");

const seed = async () => {
  try {
    const data = readExcelFile("./data/dataset.xlsx");
    
    await pool.query(`
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

    for (const row of data) {
      await pool.query(
        `INSERT INTO historical_events 
        (event_id, event_name, category, event_date, location, participants, budget_tnd, revenue_tnd, main_issue, secondary_issue, satisfaction_score) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (event_id) DO NOTHING;`,
        [row.Event_ID, row.Event_Name, row.Category, row.Date, row.Location, row.Participants, row.Budget_TND, row.Revenue_TND, row.Main_Issue, row.Secondary_Issue, row.Satisfaction_Score]
      );
    }
    console.log(`Successfully ingested ${data.length} rows into Render database!`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

seed();
