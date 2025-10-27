const express = require("express");
const router = express.Router();

// 🟢 استدعاء الميدل وير الجديد بعد التعديل
const { upload, processImage } = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getDocumentsByForm,
} = require("../controllers/documentController");

// 🟢 رفع مرفقات متعددة (الصور هتتخزن + تتحول لو HEIC/HEIF + تتضغط لو كبيرة)
router.post(
  "/",
  protect,
  upload.array("file"), // ✅ تم التبديل من single → array
  processImage,
  uploadDocument
);

// 🟡 جلب المرفقات لفورم
router.get("/:formId", protect, getDocumentsByForm);

module.exports = router;
