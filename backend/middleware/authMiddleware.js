const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🛡️ Middleware للتحقق من التوكن وصلاحية اليوزر
// protect middleware للتحقق من صلاحيات التوكن
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }
      next(); // استكمال العملية
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// authorizeRoles middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
};

module.exports = { protect, authorizeRoles };
