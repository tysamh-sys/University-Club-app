const express = require("express");
const app = express();

app.use(express.json());

const cors = require("cors");
app.use(cors());

global.logs = [];

// DB init
const { createTable } = require("./models/userModels");
createTable();

// Sentinelle
const { runSentinelle } = require("./services/sentinelleEngine");
setInterval(() => {
  runSentinelle();
}, 10000);

// 🔐 Middlewares
const blocker = require("./middlewares/blocker");
const logger = require("./middlewares/logger");
const rateLimiter = require("./middlewares/rateLimiter");

// ✅ IMPORTANT: middleware order
app.use(blocker);
app.use(rateLimiter);
app.use(logger);

// Routes
const authRoutes = require("./routers/authRouters");
app.use("/auth", authRoutes);

const userRoutes = require("./routers/userRouters");
app.use("/users", userRoutes);

const eventRoutes = require("./routers/eventRouters");
app.use("/events", eventRoutes);

const sponsorRoutes = require("./routers/sponsorRouters");
app.use("/sponsors", sponsorRoutes);

const aiRoutes = require("./routers/aiRoutes");
app.use("/ai", aiRoutes);

const fileRoutes = require("./routers/fileRouters");
app.use("/files", fileRoutes);

module.exports = app;