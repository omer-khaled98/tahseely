const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const fs = require("fs");

// 📂 تحديد مكان التخزين المؤقت
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // ✅ لو مفيش اسم أو امتداد، نضيف .jpg بشكل افتراضي
    let ext = path.extname(file.originalname);
    if (!ext && file.mimetype) {
      ext = "." + file.mimetype.split("/")[1];
    }
    if (!ext) ext = ".jpg";

    const safeName = (file.originalname || "upload").replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

// 🟢 السماح بأي نوع ملف (هنفلتر بعدين)
const fileFilter = (req, file, cb) => {
  cb(null, true);
};

// 🚀 إعدادات Multer بحد أقصى 20 ميجا لكل ملف، ورفع أكتر من واحد
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// 🟣 ميدل وير لمعالجة الصور (ضغط + تحويل ل JPG) — يدعم عدة ملفات
const processImage = async (req, res, next) => {
  try {
    // ✅ لو مفيش ملفات، نكمل عادي
    if (!req.files || req.files.length === 0) return next();

    for (const file of req.files) {
      // ✅ لو مفيش mimetype أو originalname نحط قيم افتراضية
      if (!file.mimetype || !file.originalname) {
        console.warn("⚠️ Missing mimetype/originalname — forcing .jpg");
        file.mimetype = "image/jpeg";
        const newPath = file.path + ".jpg";
        fs.renameSync(file.path, newPath);
        file.filename = path.basename(newPath);
        file.path = newPath;
      }

      const ext = path.extname(file.path).toLowerCase();
      const imageExts = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".heic",
        ".heif",
      ];

      // ✅ لو الملف مش صورة، نسيبه زي ما هو
      if (!imageExts.includes(ext)) continue;

      let outputPath = file.path;

      // 🔄 تحويل HEIC/HEIF إلى JPG
      if (ext === ".heic" || ext === ".heif") {
        try {
          const inputBuffer = fs.readFileSync(file.path);
          const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: "JPEG",
            quality: 0.8,
          });

          outputPath = file.path.replace(/\.(heic|heif)$/i, ".jpg");
          fs.writeFileSync(outputPath, outputBuffer);
          fs.unlinkSync(file.path);

          file.filename = path.basename(outputPath);
          file.path = outputPath;
          file.mimetype = "image/jpeg";
        } catch (e) {
          console.warn("⚠️ HEIC convert failed, keeping original:", e.message);
        }
      } else {
        // 📉 ضغط باقي الصور وتحويلها دائمًا لـ JPG
        try {
          const outputBuffer = await sharp(file.path)
            .resize({
              width: 2000,
              height: 2000,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 80 })
            .toBuffer();

          outputPath = file.path.replace(path.extname(file.path), ".jpg");
          fs.writeFileSync(outputPath, outputBuffer);
          if (outputPath !== file.path) fs.unlinkSync(file.path);

          file.filename = path.basename(outputPath);
          file.path = outputPath;
          file.mimetype = "image/jpeg";
        } catch (e) {
          console.warn("⚠️ Sharp compression failed, keeping original:", e.message);
        }
      }
    }

    next();
  } catch (err) {
    console.error("❌ Error in processImage:", err);
    next(); // 👇 لو حصل خطأ، نعدي الملفات زي ما هي
  }
};

module.exports = { upload, processImage };
