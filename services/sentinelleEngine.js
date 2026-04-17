const { blockUser } = require("./blockUserService");

const runSentinelle = async () => {
  const logs = global.logs || [];

  const loginLogs = logs.filter(l =>
    l.endpoint.includes("/login")
  );

  const userCount = {};

  loginLogs.forEach(l => {
    if (l.userId) {
      userCount[l.userId] = (userCount[l.userId] || 0) + 1;
    }
  });

  for (let userId in userCount) {
    const count = userCount[userId];

    if (count >= 5) {
      console.log(`🚨 Sentinelle detected attack on user ${userId}`);
      await blockUser(userId, "Auto detected brute force");
      global.logs = global.logs.filter(l => l.userId != userId);
    }
  }

  // 🛡️ FILE SYSTEM SENTINEL 
  const pool = require("../config/db");
  try {
      // Rule 1: Scraper detection
      const fileAbuseQuery = `
          SELECT user_id, count(*) as c 
          FROM file_audit_logs 
          WHERE action = 'DOWNLOAD' 
            AND timestamp > NOW() - INTERVAL '1 minute'
          GROUP BY user_id
          HAVING count(*) >= 5
      `;
      const result = await pool.query(fileAbuseQuery);
      for (let row of result.rows) {
          if (row.user_id) {
              console.log(`🚨 Sentinel Action: Scraper blocked. User ${row.user_id} downloaded ${row.c} files rapidly.`);
              await blockUser(row.user_id, "Auto detected bulk scraping of secure files");
          }
      }
      
      // Rule 2: Night shift anomalies (1 AM to 4 AM)
      const hour = new Date().getHours();
      if (hour >= 1 && hour < 4) {
          const nightAbuseQuery = `
              SELECT user_id 
              FROM file_audit_logs 
              WHERE (action = 'DOWNLOAD' OR action = 'UPLOAD' OR action = 'DELETE')
                AND timestamp > NOW() - INTERVAL '15 seconds'
          `;
          const nightResult = await pool.query(nightAbuseQuery);
          for (let row of nightResult.rows) {
              if (row.user_id) {
                  console.log(`🚨 Sentinel Action: After-hours block. User ${row.user_id} accessed restricted files at ${hour} AM.`);
                  await blockUser(row.user_id, "Auto detected suspicious after-hours file access");
              }
          }
      }
  } catch (e) {
      console.log("Sentinel optional file check error (ignore if table building): ", e.message);
  }
};

module.exports = { runSentinelle };