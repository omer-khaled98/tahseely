const Form = require("../models/Form");
const ExcelJS = require("exceljs");

/* ================= Helpers ================= */
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const sum = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0);

/* =====================================================
   📊 PREVIEW (SUMMARY / DETAILED)
===================================================== */
const salesReportPreview = async (req, res) => {
  try {
    const { branches, from, to, mode = "summary" } = req.query;
    if (!branches || !from || !to) {
      return res.status(400).json({ message: "branches, from, to are required" });
    }

    const branchIds = branches.split(",");

    const forms = await Form.find({
      branch: { $in: branchIds },
      formDate: { $gte: new Date(from), $lte: new Date(to) },
      "adminRelease.status": "pending",
    })
      .populate("branch", "name")
      .sort({ formDate: 1 });

    /* ===== SUMMARY ===== */
    if (mode === "summary") {
      const rows = forms.map((f) => ({
        date: iso(f.formDate),
        branch: f.branch?.name || "-",
        serial: f.serialNumber,
        cash: f.cashCollection || 0,
        apps: f.appsTotal || 0,
        bank: f.bankTotal || 0,
        total: f.totalSales || 0, // 👈 الإجمالي (كل شيء ماعدا العهدة)
        purchases: f.purchases || 0,
        petty: f.pettyCash || 0,
      }));

      return res.json(rows);
    }

    /* ===== DETAILED ===== */
    const appSet = new Set();
    const bankSet = new Set();

    forms.forEach((f) => {
      (f.applications || []).forEach((a) => appSet.add(a.name));
      (f.bankCollections || []).forEach((b) => bankSet.add(b.name));
    });

    const apps = [...appSet];
    const banks = [...bankSet];

    const rows = forms.map((f) => {
      const row = {
        date: iso(f.formDate),
        branch: f.branch?.name || "-",
        serial: f.serialNumber,
        cash: f.cashCollection || 0,
        total: f.totalSales || 0,
        purchases: f.purchases || 0,
        petty: f.pettyCash || 0,
      };

      apps.forEach((name) => {
        const found = (f.applications || []).find((a) => a.name === name);
        row[`app_${name}`] = found ? found.amount : 0;
      });

      banks.forEach((name) => {
        const found = (f.bankCollections || []).find((b) => b.name === name);
        row[`bank_${name}`] = found ? found.amount : 0;
      });

      return row;
    });

    return res.json({ columns: { apps, banks }, rows });
  } catch (err) {
    console.error("❌ salesReportPreview:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   📥 EXCEL EXPORT (TABLE ONLY – NO HEADER / NO LOGO)
===================================================== */
const salesReportExcel = async (req, res) => {
  try {
    const { branches, from, to, mode = "summary" } = req.query;
    if (!branches || !from || !to) {
      return res.status(400).json({ message: "branches, from, to are required" });
    }

    const branchIds = branches.split(",");

    const forms = await Form.find({
      branch: { $in: branchIds },
      formDate: { $gte: new Date(from), $lte: new Date(to) },
      "adminRelease.status": "pending",
    })
      .populate("branch", "name")
      .sort({ formDate: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales");

    /* ===== SUMMARY ===== */
    if (mode === "summary") {
      sheet.columns = [
        { header: "التاريخ", key: "date", width: 14 },
        { header: "الفرع", key: "branch", width: 20 },
        { header: "رقم التقرير", key: "serial", width: 20 },
        { header: "كاش", key: "cash", width: 12 },
        { header: "تطبيقات", key: "apps", width: 14 },
        { header: "بنك", key: "bank", width: 14 },
        { header: "الإجمالي", key: "total", width: 16 },
        { header: "مشتريات", key: "purchases", width: 12 },
        { header: "عهدة", key: "petty", width: 12 },
      ];

      forms.forEach((f) => {
        sheet.addRow({
          date: iso(f.formDate),
          branch: f.branch?.name || "-",
          serial: f.serialNumber,
          cash: f.cashCollection || 0,
          apps: f.appsTotal || 0,
          bank: f.bankTotal || 0,
          total: f.totalSales || 0,
          purchases: f.purchases || 0,
          petty: f.pettyCash || 0,
        });
      });
    }

    /* ===== DETAILED ===== */
    if (mode === "detailed") {
      const appSet = new Set();
      const bankSet = new Set();

      forms.forEach((f) => {
        (f.applications || []).forEach((a) => appSet.add(a.name));
        (f.bankCollections || []).forEach((b) => bankSet.add(b.name));
      });

      const apps = [...appSet];
      const banks = [...bankSet];

      sheet.columns = [
        { header: "التاريخ", key: "date", width: 14 },
        { header: "الفرع", key: "branch", width: 20 },
        { header: "رقم التقرير", key: "serial", width: 20 },
        { header: "كاش", key: "cash", width: 12 },

        ...apps.map((n) => ({
          header: `تطبيق - ${n}`,
          key: `app_${n}`,
          width: 16,
        })),

        ...banks.map((n) => ({
          header: `بنك - ${n}`,
          key: `bank_${n}`,
          width: 16,
        })),

        { header: "الإجمالي", key: "total", width: 16 },
        { header: "مشتريات", key: "purchases", width: 12 },
        { header: "عهدة", key: "petty", width: 12 },
      ];

      forms.forEach((f) => {
        const row = {
          date: iso(f.formDate),
          branch: f.branch?.name || "-",
          serial: f.serialNumber,
          cash: f.cashCollection || 0,
          total: f.totalSales || 0,
          purchases: f.purchases || 0,
          petty: f.pettyCash || 0,
        };

        apps.forEach((n) => {
          const found = (f.applications || []).find((a) => a.name === n);
          row[`app_${n}`] = found ? found.amount : 0;
        });

        banks.forEach((n) => {
          const found = (f.bankCollections || []).find((b) => b.name === n);
          row[`bank_${n}`] = found ? found.amount : 0;
        });

        sheet.addRow(row);
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.xlsx"
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (err) {
    console.error("❌ salesReportExcel:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  salesReportPreview,
  salesReportExcel,
};
