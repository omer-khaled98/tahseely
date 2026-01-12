const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const {
  salesReportExcel,
  salesReportPreview,
} = require("../controllers/adminSalesReportController");

router.get(
  "/sales-report-preview",
  protect,
  authorizeRoles("Admin"),
  salesReportPreview
);

router.get(
  "/sales-report",
  protect,
  authorizeRoles("Admin"),
  salesReportExcel
);

module.exports = router;
