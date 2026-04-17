const { blockUser } = require("../services/blockUserService");

// 🔍 detect brute force
const detectBruteForce = async () => {
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

  let alerts = [];

  for (let userId in userCount) {
    const count = userCount[userId];

    if (count >= 5) {
      await blockUser(userId, "Brute force detected");

      alerts.push({
        type: "BLOCKED",
        userId: Number(userId),
        message: "User automatically blocked by Sentinelle"
      });
    }
  }

  return alerts;
};

// 📊 API analyze
const analyzeLogs = async (req, res) => {
  const alerts = await detectBruteForce();

  const blocked = await fetch(
    `${process.env.POSTIGER_URL}/blocked_users`,
    {
      headers: {
        apikey: process.env.POSTIGER_KEY
      }
    }
  ).then(r => r.json());

  return res.json({
    total_logs: global.logs.length,
    alerts,
    blocked_users: blocked
  });
};

module.exports = { analyzeLogs };