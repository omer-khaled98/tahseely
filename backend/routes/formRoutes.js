// routes/formRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  createForm,
  getMyForms,
  updateForm,
  releaseForm,
  adminReleaseForm,
  rejectForm,
  listFormsForReview,
  listFormsForAdmin,
  adminRejectForm,
  listFormsForBranchManager,
  branchManagerReleaseForm,
  branchManagerRejectForm,
  // ✅ أضف السطرين دول
  listAllForms,
  deleteFormPermanently,
} = require("../controllers/formController");


//
// 🟢 User routes
//
router.post("/", protect, createForm);
router.get("/me", protect, getMyForms);
router.patch("/:id", protect, updateForm);


//
// 🟡 Accountant routes
//
router.get("/review", protect, authorizeRoles("Accountant"), listFormsForReview);
router.patch("/:id/release", protect, authorizeRoles("Accountant"), releaseForm);
router.patch("/:id/reject", protect, authorizeRoles("Accountant"), rejectForm);


//
// 🔵 Admin routes
//
router.get("/admin", protect, authorizeRoles("Admin"), listFormsForAdmin);
router.patch("/:id/admin-release", protect, authorizeRoles("Admin"), adminReleaseForm);
router.patch("/:id/admin-reject", protect, authorizeRoles("Admin"), adminRejectForm);

// ✅ route جديد للفواتير كلها + الحذف النهائي
router.get("/all", protect, authorizeRoles("Admin"), listAllForms);
router.delete("/:id/delete", protect, authorizeRoles("Admin"), deleteFormPermanently);


//
// 🟣 Branch Manager routes
//
router.get("/branch-manager", protect, authorizeRoles("BranchManager"), listFormsForBranchManager);
router.patch("/:id/branch-release", protect, authorizeRoles("BranchManager"), branchManagerReleaseForm);
router.patch("/:id/branch-reject", protect, authorizeRoles("BranchManager"), branchManagerRejectForm);

module.exports = router;
