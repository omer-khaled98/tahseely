// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🛡️ protect middleware للتحقق من التوكن وصلاحية اليوزر
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      return next(); // ✅ مهم: نرجّع هنا عشان مايكملش تحت
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res
        .status(401)
        .json({ message: "Not authorized, invalid token" });
    }
  }

  // لو مفيش توكن أصلاً
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
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
};

// ✅ Admin-only middleware (اختصار جاهز)
const adminOnly = authorizeRoles("Admin");

module.exports = { protect, authorizeRoles, adminOnly };
