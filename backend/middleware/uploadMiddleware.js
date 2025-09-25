const multer = require("multer");
const path = require("path");

// 📂 تحديد مكان واسم الملف
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // يخزن في فولدر uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// ✅ فلتر الملفات (صور أو PDF فقط)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff",
    ".pdf"
  ];

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files and PDFs are allowed"), false);
  }
};

// 🟢 Multer من غير قيود حجم (ممكن تضيف limits لو عاوز)
const upload = multer({ storage, fileFilter });

module.exports = upload;
