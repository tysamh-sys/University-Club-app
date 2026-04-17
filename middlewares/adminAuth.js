const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
    const header = req.headers.authorization;

    if (!header)
        return res.status(401).json({ message: "No token provided" });

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "SECRET_KEY"); // Same as auth.js
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = adminAuth;
