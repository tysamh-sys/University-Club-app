require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 3000;

const authRouters = require("./routers/authRouters");
const userRouters = require("./routers/userRouters");
const eventRouters = require("./routers/eventRouters");
const chatRouters = require("./routers/chatRouters");
const fileRouters = require("./routers/fileRouters");
const problemRouters = require("./routers/problemRouters");
const securityRouters = require("./routers/securityRouters");
const notificationRouters = require("./routers/notificationRouters");

app.use("/api/auth", authRouters);
app.use("/api/users", userRouters);
app.use("/api/events", eventRouters);
app.use("/api/chat", chatRouters);
app.use("/api/files", fileRouters);
app.use("/api/problems", problemRouters);
app.use("/api/security", securityRouters);
app.use("/api/notifications", notificationRouters);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});