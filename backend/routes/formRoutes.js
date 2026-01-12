const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const formController = require("../controllers/formController");
const reviewController = require("../controllers/reviewController");
const { getMissingFormsDays } = require("../controllers/adminAnalyticsController");

const {
  createForm,
  getMyForms,
  updateForm,
  releaseForm,
  rejectForm,
  branchManagerReleaseForm,
  branchManagerRejectForm,
  adminReleaseForm,
  adminRejectForm,
  resubmitForm,
  listFormsForReview,
  listFormsForAdmin,
  listFormsForBranchManager,
  listAllForms,
  deleteFormPermanently,
  mapOut,
} = formController;

/* ================= 🟢 User routes ================= */
router.post("/", protect, createForm);
router.get("/me", protect, getMyForms);
router.patch("/:id", protect, updateForm);

/* ================= 🟡 Accountant routes ================= */
router.get(
  "/review",
  protect,
  authorizeRoles("Accountant"),
  listFormsForReview
);

router.patch(
  "/:id/release",
  protect,
  authorizeRoles("Accountant"),
  releaseForm
);

router.patch(
  "/:id/reject",
  protect,
  authorizeRoles("Accountant"),
  rejectForm
);

// ✅ إعادة إرسال بعد رفض المدير
router.patch(
  "/:id/resubmit",
  protect,
  authorizeRoles("Accountant"),
  resubmitForm
);

/* ================= 🟣 Branch Manager routes ================= */
router.get(
  "/branch-manager",
  protect,
  authorizeRoles("BranchManager"),
  listFormsForBranchManager
);

router.patch(
  "/:id/branch-release",
  protect,
  authorizeRoles("BranchManager"),
  branchManagerReleaseForm
);

router.patch(
  "/:id/branch-reject",
  protect,
  authorizeRoles("BranchManager"),
  branchManagerRejectForm
);

/* ================= 🔵 Admin routes ================= */
router.get(
  "/admin",
  protect,
  authorizeRoles("Admin"),
  listFormsForAdmin
);

router.patch(
  "/:id/admin-release",
  protect,
  authorizeRoles("Admin"),
  adminReleaseForm
);

router.patch(
  "/:id/admin-reject",
  protect,
  authorizeRoles("Admin"),
  adminRejectForm
);

router.get(
  "/all",
  protect,
  authorizeRoles("Admin"),
  listAllForms
);

router.delete(
  "/:id/delete",
  protect,
  authorizeRoles("Admin"),
  deleteFormPermanently
);

/* ================= 🟠 Admin Analytics ================= */
/**
 * 🔍 الأيام التي لم يتم إنشاء فورم بها
 * query:
 *  - branchId
 *  - from (YYYY-MM-DD)
 *  - to   (YYYY-MM-DD)
 */
router.get(
  "/admin/missing-forms",
  protect,
  authorizeRoles("Admin"),
  getMissingFormsDays
);

/* ================= ⚙️ Review Controller (اختياري / موحّد) ================= */
router.get("/review-list", protect, reviewController.listFormsForReview);

router.put(
  "/:id/accountant",
  protect,
  authorizeRoles("Accountant"),
  reviewController.accountantReleaseAction
);

router.put(
  "/:id/branch-manager",
  protect,
  authorizeRoles("BranchManager"),
  reviewController.branchManagerAction
);

router.put(
  "/:id/admin",
  protect,
  authorizeRoles("Admin"),
  reviewController.adminReleaseAction
);

/* ================= 🧾 عرض فورم واحد بالتفصيل ================= */
router.get("/:id", protect, async (req, res) => {
  try {
    const Form = require("../models/Form");

    const form = await Form.findById(req.params.id)
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("branchManagerRelease.by", "name")
      .populate("adminRelease.by", "name");

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    const formatted = mapOut(form);
    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching form by ID:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = router;
