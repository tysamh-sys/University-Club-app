// trigger_ingest.js — Logs in as admin, then calls /ai/ingest-excel on Render
const https = require("https");

const API = "university-club-app.onrender.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@vital.com";
const ADMIN_PASS  = process.env.ADMIN_PASS  || "admin123";

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: API,
      port: 443,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log(`1️⃣  Logging in as ${ADMIN_EMAIL}...`);
    const login = await post("/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASS });
    console.log("   Status:", login.status);

    if (!login.body.token) {
      console.error("❌ Login failed:", login.body);
      process.exit(1);
    }

    const token = login.body.token;
    console.log("   ✅ Got token.");

    console.log("2️⃣  Calling /ai/ingest-excel on Render...");
    const ingest = await post("/ai/ingest-excel", {}, token);
    console.log("   Status:", ingest.status);
    console.log("   Response:", ingest.body);

    if (ingest.status === 200 || ingest.status === 201) {
      console.log("\n🎉 Historical dataset successfully ingested into Render PostgreSQL!");
    } else {
      console.error("\n❌ Ingest failed.");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
})();
