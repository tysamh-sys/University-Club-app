const blockUserMiddleware = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const blocked = await fetch(
      `${process.env.POSTIGER_URL}/blocked_users?user_id=eq.${req.user.id}`,
      {
        headers: {
          apikey: process.env.POSTIGER_KEY
        }
      }
    ).then(r => r.json());

    if (blocked.length > 0) {
      return res.status(403).json({
        message: "🚫 Account blocked by Sentinelle"
      });
    }

    next();
  } catch (err) {
    next();
  }
};

module.exports = blockUserMiddleware;