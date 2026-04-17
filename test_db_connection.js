require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(client => {
        console.log("Connected successfully");
        client.release();
        process.exit(0);
    })
    .catch(err => {
        console.error("Connection error:", err.message);
        process.exit(1);
    });
