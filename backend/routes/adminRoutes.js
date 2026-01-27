const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/authMiddleware");
const { exportBackups } = require("../controllers/backupController");
console.log("protect:", typeof protect);
console.log("adminOnly:", typeof adminOnly);
console.log("exportBackups:", typeof exportBackups);

router.get("/backups/export", protect, adminOnly, exportBackups);

module.exports = router;
