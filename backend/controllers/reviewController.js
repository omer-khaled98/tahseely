const Form = require("../models/Form");

// ================== 1) جلب النماذج للمراجعة ==================
const listFormsForReview = async (req, res) => {
  try {
    const { branches, statuses, dateFrom, dateTo, q } = req.query;
    const query = {};

    // ✅ دعم اختيار أكتر من فرع
    if (branches) {
      const arr = Array.isArray(branches) ? branches : branches.split(",");
      query.branch = { $in: arr };
    }

    // ✅ التاريخ
    if (dateFrom || dateTo) {
      query.formDate = {};
      if (dateFrom) query.formDate.$gte = new Date(dateFrom);
      if (dateTo) query.formDate.$lte = new Date(dateTo);
    }

    // ✅ لو محاسب: قصر على فروعه فقط
    if (req.user.role === "Accountant") {
      const assigned = (req.user.assignedBranches || []).map(b => String(b));
      query.branch = query.branch || { $in: assigned };
    }

    // ✅ الحالات (أكتر من واحدة)
    if (statuses) {
      const arr = Array.isArray(statuses) ? statuses : statuses.split(",");
      if (req.user.role === "Accountant") query["accountantRelease.status"] = { $in: arr };
      if (req.user.role === "BranchManager") query["branchManagerRelease.status"] = { $in: arr };
      if (req.user.role === "Admin") query["adminRelease.status"] = { $in: arr };
    }

    // 🔍 البحث بالنص
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ notes: regex }];
    }

    const forms = await Form.find(query)
      .sort({ formDate: -1 })
      .populate("user", "name")
      .populate("branch", "name")
      .populate("accountantRelease.by", "name")
      .populate("branchManagerRelease.by", "name")
      .populate("adminRelease.by", "name");

    res.json(forms);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ================== 2) إجراء المحاسب ==================
const accountantReleaseAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body; // 'release' | 'reject'
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.accountantRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
      note: note || ""
    };

    form.status = action === "release" ? "released" : "rejected";

    await form.save();
    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name");

    res.json({ message: `Form ${action} by accountant`, form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ================== 3) إجراء مدير الفرع ==================
const branchManagerAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "Requires accountant release first" });
    }

    if (action === "reject" && !note) {
      return res.status(400).json({ message: "Reason is required when rejecting" });
    }

    form.branchManagerRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
      note: note || ""
    };

    // ✅ منطق خاص بالرفض: ترجع للمحاسب
    if (action === "reject") {
      form.status = "rejected_by_manager";
      form.accountantRelease.status = "pending";
      form.accountantRelease.returnReason = note;
    } else {
      form.status = "released";
    }

    await form.save();
    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name");

    res.json({ message: `Form ${action} by branch manager`, form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ================== 4) إجراء الأدمن ==================
const adminReleaseAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released" || form.branchManagerRelease?.status !== "released") {
      return res.status(400).json({ message: "Requires accountant & manager release first" });
    }

    form.adminRelease = {
      status: action === "release" ? "released" : "rejected",
      by: req.user._id,
      at: new Date(),
      note: note || ""
    };

    form.status = action === "release" ? "released" : "rejected";

    await form.save();
    const populated = await Form.findById(id)
      .populate("user", "name")
      .populate("branch", "name");

    res.json({ message: `Form ${action} by admin`, form: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = {
  listFormsForReview,
  accountantReleaseAction,
  branchManagerAction,
  adminReleaseAction
};
