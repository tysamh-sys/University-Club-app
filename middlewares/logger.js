const logger = (req, res, next) => {
  if (!global.logs) global.logs = [];

  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);

  global.logs.push({
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    endpoint: req.originalUrl,
    method: req.method,
    time: new Date()
  });

  next();
};

module.exports = logger;