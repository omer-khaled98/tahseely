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
  listAllForms,
  deleteFormPermanently,
  // ✅ أضفنا mapOut علشان نستخدمه في آخر Route
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
router.get("/all", protect, authorizeRoles("Admin"), listAllForms);
router.delete("/:id/delete", protect, authorizeRoles("Admin"), deleteFormPermanently);

//
// 🟣 Branch Manager routes
//
router.get("/branch-manager", protect, authorizeRoles("BranchManager"), listFormsForBranchManager);
router.patch("/:id/branch-release", protect, authorizeRoles("BranchManager"), branchManagerReleaseForm);
router.patch("/:id/branch-reject", protect, authorizeRoles("BranchManager"), branchManagerRejectForm);

//
// 🟠 عرض فاتورة معينة بالتفصيل (للمعاينة)
router.get("/:id", protect, authorizeRoles("Admin"), async (req, res) => {
  try {
    const Form = require("../models/Form");
    // ✅ استدعاء mapOut
    const { mapOut } = require("../controllers/formController");

    const form = await Form.findById(req.params.id)
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("branchManagerRelease.by", "name")
      .populate("adminRelease.by", "name");

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // ✅ تمرير الفورم عبر mapOut لتنسيق القيم
    const formatted = mapOut(form);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching form by ID:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
