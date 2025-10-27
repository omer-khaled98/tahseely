const Document = require("../models/Document");

// 🟢 رفع مرفقات متعددة
const uploadDocument = async (req, res) => {
  try {
    const { form: formFromBody, formId, type } = req.body;
    const form = formId || formFromBody;

    console.log("📥 Full req.body:", req.body);
    console.log("📂 Uploaded files:", req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "لم يتم رفع أي ملف" });
    }
    if (!form) {
      return res.status(400).json({ message: "Form ID مفقود" });
    }

    const allowedTypes = ["cash", "bank", "apps", "purchase", "petty"];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        message: `يجب تحديد نوع المرفق بشكل صحيح (القيم المسموحة: ${allowedTypes.join(", ")})`,
      });
    }

    const uploadedDocs = [];

    for (const file of req.files) {
      const cleanPath = `/uploads/${file.filename}`.replace(/\\/g, "/");

      console.log("📝 Upload request:", {
        form,
        type,
        file: file.filename,
        cleanPath,
      });

      const doc = await Document.create({
        form,
        type,
        fileUrl: cleanPath,
      });

      uploadedDocs.push(doc);
      console.log("✅ Document created:", doc.fileUrl);
    }

    return res.status(201).json(uploadedDocs);
  } catch (error) {
    console.error("❌ Error uploading document:", error);
    return res.status(500).json({
      message: error.message,
      stack: error.stack,
    });
  }
};

// 🟡 جلب مرفقات لفورم
const getDocumentsByForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const docs = await Document.find({ form: formId });
    return res.json(docs);
  } catch (error) {
    console.error("❌ Error fetching documents:", error);
    return res.status(500).json({ message: error.message, stack: error.stack });
  }
};

module.exports = { uploadDocument, getDocumentsByForm };
