const blockUserMiddleware = async (req, res, next) => {
  try {
    // placeholder (تعديلو لاحقًا)
    return next();
  } catch (err) {
    next();
  }
};

module.exports = blockUserMiddleware;