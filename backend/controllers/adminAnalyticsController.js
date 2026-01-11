const Form = require("../models/Form");

/**
 * GET /api/admin/missing-forms
 * query:
 *  - branchId (required)
 *  - from (YYYY-MM-DD)
 *  - to   (YYYY-MM-DD)
 */
const getMissingFormsDays = async (req, res) => {
  try {
    const { branchId, from, to } = req.query;

    if (!branchId || !from || !to) {
      return res.status(400).json({
        message: "branchId, from, to are required",
      });
    }

    const start = new Date(from);
    const end = new Date(to);

    // 1️⃣ هات كل الفورمات الموجودة
    const forms = await Form.find({
      branch: branchId,
      formDate: { $gte: start, $lte: end },
    }).select("formDate");

    // 2️⃣ الأيام اللي فيها فورم
    const existingDays = new Set(
      forms.map((f) => f.formDate.toISOString().split("T")[0])
    );

    // 3️⃣ لف على كل أيام الفترة
    const missingDays = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const dayStr = cursor.toISOString().split("T")[0];

      if (!existingDays.has(dayStr)) {
        missingDays.push(dayStr);
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return res.json({
      branchId,
      from,
      to,
      missingDays,
      totalMissing: missingDays.length,
    });
  } catch (error) {
    console.error("❌ getMissingFormsDays error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getMissingFormsDays };
