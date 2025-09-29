const express = require("express");
const router = express.Router();

// 🟢 استدعاء الميدل وير الجديد بعد التعديل
const { upload, processImage } = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { uploadDocument, getDocumentsByForm } = require("../controllers/documentController");

// 🟢 رفع مرفق (الصورة هتتخزن + تتحول لو HEIC/HEIF + تتضغط لو كبيرة)
router.post(
  "/",
  protect,
  upload.single("file"),   // Multer يخزن الملف مؤقت
  processImage,            // نضغط/نحوّل الصورة
  uploadDocument           // نضيفها في الداتابيز ونرجّع fileUrl
);

// 🟡 جلب المرفقات لفورم
router.get("/:formId", protect, getDocumentsByForm);

module.exports = router;
