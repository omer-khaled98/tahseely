// backend/controllers/backupController.js
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");

const Form = require("../models/Form");
const Document = require("../models/Document");
const Branch = require("../models/Branch");

const iso = (d) => new Date(d).toISOString().slice(0, 10);

// ✅ تنظيف اسم الفرع عشان مايكسرش الفولدرات
const safeFolderName = (name) =>
  String(name || "UnknownBranch")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

// ✅ حل جذري لمسار الملفات:
// doc.fileUrl عندك بيكون: "/uploads/1767...-blob.jpg"
// لازم نطلّع مسار فعلي على الديسك: "<backend>/uploads/1767...-blob.jpg"
const resolveFilePath = (fileUrl) => {
  if (!fileUrl) return null;

  // 1) normalize slashes + remove leading slashes
  let clean = String(fileUrl).replace(/\\/g, "/").replace(/^\/+/, ""); // => "uploads/1767...-blob.jpg"

  // 2) remove "uploads/" prefix if exists (عشان ما يبقاش uploads/uploads)
  clean = clean.replace(/^uploads\//, ""); // => "1767...-blob.jpg"

  // 3) حماية بسيطة من path traversal + تأكيد إننا بنجيب اسم الملف فقط
  const filename = path.basename(clean);

  // 4) رجّع المسار النهائي داخل backend/uploads
  return path.join(process.cwd(), "uploads", filename);
};

// ✅ يبني تقرير Excel "شيك" للفورم
async function buildFormExcelBuffer(form, docs) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance System";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Report", {
    views: [{ rightToLeft: true }],
  });

  // عنوان
  sheet.addRow(["تقرير تحصيل"]);
  sheet.getRow(1).font = { size: 16, bold: true };
  sheet.addRow([]);

  // بيانات أساسية
  const baseRows = [
    ["التاريخ", iso(form.formDate)],
    ["الفرع", form.branch?.name || "-"],
    ["المستخدم", form.user?.name || "-"],
    ["الرقم التسلسلي", form.serialNumber || "-"],
    ["الحالة", form.status || "-"],
    ["حالة الإدمن", form.adminRelease?.status || form.adminStatus || "pending"],
    ["ملاحظات", form.notes || "-"],
  ];

  baseRows.forEach((r) => sheet.addRow(r));
  sheet.addRow([]);

  // إجماليات مالية
  const appsTotal = Array.isArray(form.applications)
    ? form.applications.reduce((s, a) => s + Number(a?.amount || 0), 0)
    : Number(form.appsTotal || form.appsCollection || 0);

  const bankTotal = Array.isArray(form.bankCollections)
    ? form.bankCollections.reduce((s, b) => s + Number(b?.amount || 0), 0)
    : Number(form.bankTotal || 0);

  const cash = Number(form.cashCollection || 0);
  const purchases = Number(form.purchases || 0);
  const petty = Number(form.pettyCash || 0);
  const total = cash + appsTotal + bankTotal;

  sheet.addRow(["ملخص مالي"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };
  sheet.addRow(["نقدي", cash]);
  sheet.addRow(["تطبيقات", appsTotal]);
  sheet.addRow(["بنك", bankTotal]);
  sheet.addRow(["الإجمالي", total]);
  sheet.addRow(["مشتريات", purchases]);
  sheet.addRow(["عهدة", petty]);

  sheet.addRow([]);

  // تفاصيل التطبيقات
  sheet.addRow(["تفاصيل التطبيقات"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };
  sheet.addRow(["الاسم", "المبلغ"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  (form.applications || []).forEach((a) => {
    sheet.addRow([a?.name || "-", Number(a?.amount || 0)]);
  });

  sheet.addRow([]);

  // تفاصيل البنك
  sheet.addRow(["تفاصيل البنك"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };
  sheet.addRow(["الاسم", "المبلغ"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  (form.bankCollections || []).forEach((b) => {
    sheet.addRow([b?.name || "-", Number(b?.amount || 0)]);
  });

  sheet.addRow([]);

  // المرفقات
  sheet.addRow(["المرفقات"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };
  sheet.addRow(["النوع", "المسار", "اسم الملف"]);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  (docs || []).forEach((d) => {
    sheet.addRow([d?.type || "-", d?.fileUrl || "-", path.basename(d?.fileUrl || "-")]);
  });

  // أعمدة
  sheet.columns = [{ width: 26 }, { width: 60 }, { width: 35 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const exportBackups = async (req, res) => {
  try {
    const {
      branches,
      from,
      to,
      includeAttachments = "true",
      includeReport = "true",
      // debug = "false"  // لو عايز تفتح لوجز زيادة
    } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from و to مطلوبين" });
    }

    let branchIds = [];
    if (!branches || branches === "all") {
      const all = await Branch.find().select("_id");
      branchIds = all.map((b) => b._id);
    } else {
      branchIds = branches.split(",");
    }

    const forms = await Form.find({
      branch: { $in: branchIds },
      formDate: { $gte: new Date(from), $lte: new Date(to) },
    })
      .populate("branch", "name")
      .populate("user", "name")
      .lean();

    // هات docs مرة واحدة
    const formIds = forms.map((f) => f._id);
    const allDocs = await Document.find({ form: { $in: formIds } }).lean();

    const docsByForm = new Map();
    for (const d of allDocs) {
      const k = String(d.form);
      if (!docsByForm.has(k)) docsByForm.set(k, []);
      docsByForm.get(k).push(d);
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=backup-${from}-to-${to}.zip`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("❌ Archiver error:", err);
      try { res.end(); } catch (_) {}
    });

    archive.pipe(res);

    for (const form of forms) {
      const branchName = safeFolderName(form.branch?.name);
      const day = iso(form.formDate);
      const month = day.slice(0, 7);

      const basePath = `backup/${branchName}/${month}/${day}`;
      const docs = docsByForm.get(String(form._id)) || [];

      // ✅ report.xlsx
      if (includeReport === "true") {
        const xlsxBuffer = await buildFormExcelBuffer(form, docs);
        archive.append(xlsxBuffer, { name: `${basePath}/report.xlsx` });
      }

      // ✅ المرفقات (صور/PDF…)
      if (includeAttachments === "true") {
        for (const doc of docs) {
          const filePath = resolveFilePath(doc.fileUrl);

          // 🔎 لو حابب تشخيص سريع:
          // console.log("ATT:", doc.fileUrl, "=>", filePath, "exists:", fs.existsSync(filePath));

          if (filePath && fs.existsSync(filePath)) {
            // ممكن تقسمهم حسب type لو تحب:
            // const typeFolder = doc.type ? String(doc.type) : "other";
            // archive.file(filePath, { name: `${basePath}/attachments/${typeFolder}/${path.basename(filePath)}` });

            archive.file(filePath, {
              name: `${basePath}/attachments/${path.basename(filePath)}`,
            });
          }
        }
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("❌ Backup export error:", err);
    return res.status(500).json({ message: "فشل إنشاء النسخة الاحتياطية" });
  }
};

module.exports = { exportBackups };
