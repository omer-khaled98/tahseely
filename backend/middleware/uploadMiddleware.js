const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const fs = require("fs");

// 📂 تخزين الملفات مؤقتًا في فولدر uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// 🟢 فلتر الملفات (يقبل كل الصيغ)
const fileFilter = (req, file, cb) => {
  cb(null, true); // السماح بأي امتداد
};

// 🚀 إعدادات Multer (20MB max)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// 🟣 ميدل وير بعد الرفع: معالجة الصور فقط
const processImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const ext = path.extname(req.file.originalname).toLowerCase();

    // ✅ لو مش صورة، عدي زي ما هو
    const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".heic", ".heif"];
    if (!imageExts.includes(ext)) {
      return next();
    }

    let outputPath = req.file.path;

    // 🔄 لو HEIC → JPG
    if (ext === ".heic" || ext === ".heif") {
      try {
        const inputBuffer = fs.readFileSync(req.file.path);
        const outputBuffer = await heicConvert({
          buffer: inputBuffer,
          format: "JPEG",
          quality: 0.8,
        });

        outputPath = req.file.path.replace(/\.(heic|heif)$/i, ".jpg");
        fs.writeFileSync(outputPath, outputBuffer);
        fs.unlinkSync(req.file.path);

        req.file.filename = path.basename(outputPath);
        req.file.path = outputPath;
      } catch (e) {
        console.warn("⚠️ HEIC convert failed, keeping original:", e.message);
      }
    } else {
      // 📉 ضغط باقي الصور لـ JPG
      try {
        const outputBuffer = await sharp(req.file.path)
          .resize({
            width: 2000,
            height: 2000,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        outputPath = req.file.path.replace(path.extname(req.file.path), ".jpg");
        fs.writeFileSync(outputPath, outputBuffer);
        if (outputPath !== req.file.path) fs.unlinkSync(req.file.path);

        req.file.filename = path.basename(outputPath);
        req.file.path = outputPath;
      } catch (e) {
        console.warn("⚠️ Sharp compression failed, keeping original:", e.message);
      }
    }

    next();
  } catch (err) {
    console.error("❌ Error in processImage:", err);
    // 👇 متوقفش السيرفر، عدّي وخلي الملف الأصلي زي ما هو
    next();
  }
};

module.exports = { upload, processImage };
