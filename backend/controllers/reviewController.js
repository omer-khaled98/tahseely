const Form = require("../models/Form");

// ================== 1) جلب النماذج للمراجعة ==================
const listFormsForReview = async (req, res) => {
  try {
    const { branch, status, dateFrom, dateTo, q } = req.query;
    const query = {};

    // فلتر الفرع
    if (branch) query.branch = branch;

    // فلتر التاريخ
    if (dateFrom || dateTo) {
      query.formDate = {};
      if (dateFrom) query.formDate.$gte = new Date(dateFrom);
      if (dateTo) query.formDate.$lte = new Date(dateTo);
    }

    // لو محاسب: قصر على فروعه
    if (req.user.role === "Accountant") {
      const assigned = (req.user.assignedBranches || []).map((b) => String(b));
      query.branch = branch ? branch : { $in: assigned };
    }

    // فلتر الحالة
    if (status) {
      if (req.user.role === "Accountant") query["accountantRelease.status"] = status;
      if (req.user.role === "Admin") query["adminRelease.status"] = status;
    }

    // 🔍 فلتر البحث (MongoDB regex بدلاً من الفلترة في الذاكرة)
    let searchQuery = {};
    if (q) {
      const regex = new RegExp(q, "i"); // i = ignore case
      searchQuery = {
        $or: [
          { notes: regex },
          { "user.name": regex },
          { "branch.name": regex },
        ],
      };
    }

    // جلب البيانات
    const forms = await Form.find({ ...query, ...searchQuery })
      .sort({ formDate: -1 })
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json(forms);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ================== 2) إجراء المحاسب (Release / Reject) ==================
const accountantReleaseAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // 'release' | 'reject'
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.accountantRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
    };

    if (notes) form.notes = `${form.notes ? form.notes + " | " : ""}[ACC] ${notes}`;
    form.status = action === "release" ? "released" : "rejected";

    await form.save();

    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json({ message: "Accountant action saved", form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ================== 3) إجراء الأدمن (Release / Reject) ==================
const adminReleaseAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "Requires accountant release first" });
    }

    form.adminRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
    };

    if (notes) form.notes = `${form.notes ? form.notes + " | " : ""}[ADMIN] ${notes}`;
    form.status = action === "release" ? "released" : "rejected";

    await form.save();

    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json({ message: "Admin action saved", form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { listFormsForReview, accountantReleaseAction, adminReleaseAction };
