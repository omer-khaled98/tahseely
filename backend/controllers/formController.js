const Form = require("../models/Form");
const ReportTemplate = require("../models/ReportTemplate");

// 🧩 مساعد: تحويل templateId/methodId -> lineItem مع اسم ثابت
async function buildLinesFromTemplates(items, group) {
  const normalized = (items || []).map(x => ({
    templateId: x.templateId || x.methodId || null,
    amount: Number(x.amount) || 0,
    name: x.name,
  }));

  const ids = normalized.filter(x => x.templateId).map(x => x.templateId);
  const templates = ids.length
    ? await ReportTemplate.find({
        _id: { $in: ids },
        group,
        isActive: true,
      }).select("_id name")
    : [];
  const map = new Map(templates.map(t => [String(t._id), t]));

  return normalized
    .filter(x => x.templateId || x.name)
    .map(x => {
      if (x.templateId && map.has(String(x.templateId))) {
        const t = map.get(String(x.templateId));
        return { template: t._id, name: t.name, amount: x.amount };
      }
      return { name: String(x.name || ""), amount: x.amount };
    });
}

/* 🔎 Helper لإخراج الفورم بشكل موحّد (مأمن ضد undefined) */
function mapOut(f) {
  const appsTotal =
    typeof f.appsTotal === "number" ? f.appsTotal : f.appsCollection || 0;
  const legacyBank = (f.bankMada || 0) + (f.bankVisa || 0);
  const bankDyn = (f.bankCollections || []).reduce(
    (s, x) => s + Number(x?.amount || 0),
    0
  );
  const bankTotal =
    typeof f.bankTotal === "number" ? f.bankTotal : legacyBank + bankDyn;
  const totalSales =
    typeof f.totalSales === "number"
      ? f.totalSales
      : Number(f.cashCollection || 0) + appsTotal + bankTotal;

  const accountantRelease =
    f.accountantRelease && typeof f.accountantRelease === "object"
      ? f.accountantRelease
      : { status: "pending", note: "" };

  const branchManagerRelease =
    f.branchManagerRelease && typeof f.branchManagerRelease === "object"
      ? f.branchManagerRelease
      : { status: "pending", note: "" };

  const adminRelease =
    f.adminRelease && typeof f.adminRelease === "object"
      ? f.adminRelease
      : { status: "pending", note: "" };

  return {
    _id: f._id,
    formDate: f.formDate,
    branch: f.branch,
    user: f.user,

    pettyCash: f.pettyCash || 0,
    purchases: f.purchases || 0,
    cashCollection: f.cashCollection || 0,
applications: (f.applications || []).map(a => ({
  name: a.name || a.methodName || a.templateName || "غير مسمى",
  amount: Number(a.amount || 0)
})),

bankCollections: (f.bankCollections || []).map(b => ({
  name: b.name || b.methodName || b.templateName || "غير مسمى",
  amount: Number(b.amount || 0)
})),


    appsTotal,
    bankTotal,
    totalSales,

    actualSales: f.actualSales || 0,
    notes: f.notes || "",

    status: f.status || "draft",
    accountantRelease,
    branchManagerRelease,
    adminRelease,

    adminNote: f.adminNote || "",
    receivedCash: f.receivedCash || 0,
    receivedApps: f.receivedApps || 0,
    receivedBank: f.receivedBank || 0,

    createdAt: f.createdAt,
  };
}

// 🟢 إنشاء فورم
const createForm = async (req, res) => {
  try {
    const {
      formDate,
      branch,
      pettyCash = 0,
      purchases = 0,
      cashCollection = 0,
      bankMada = 0,
      bankVisa = 0,
      actualSales = 0,
      notes = "",
      applications = [],
      bankCollections = [],
    } = req.body;

    const assigned = (req.user.assignedBranches || []).map(b => b.toString());
    if (!assigned.includes(String(branch))) {
      return res
        .status(403)
        .json({ message: "Not authorized for this branch" });
    }

    const appsLine = await buildLinesFromTemplates(applications, "applications");
    const bankLine = await buildLinesFromTemplates(bankCollections, "bank");

    const form = await Form.create({
      user: req.user._id,
      branch,
      formDate: new Date(formDate),
      pettyCash: Number(pettyCash) || 0,
      purchases: Number(purchases) || 0,
      cashCollection: Number(cashCollection) || 0,
      bankMada: Number(bankMada) || 0,
      bankVisa: Number(bankVisa) || 0,
      actualSales: Number(actualSales) || 0,
      notes,
      applications: appsLine,
      bankCollections: bankLine,
      accountantRelease: { status: "pending", note: "" },
      branchManagerRelease: { status: "pending", note: "" },
      adminRelease: { status: "pending", note: "" },
      status: "draft",
    });

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" },
    ]);

    return res.status(201).json(mapOut(populated));
  } catch (error) {
    console.error("❌ createForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟡 تحديث فورم
const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    const isEditable =
      form.accountantRelease?.status !== "released" ||
      form.branchManagerRelease?.status === "rejected";
    if (!isEditable) {
      return res
        .status(400)
        .json({ message: "لا يمكن تعديل التقرير في هذه المرحلة" });
    }

    const {
      pettyCash,
      purchases,
      cashCollection,
      bankMada,
      bankVisa,
      actualSales,
      notes,
      applications,
      bankCollections,
    } = req.body;

    if (pettyCash !== undefined) form.pettyCash = Number(pettyCash) || 0;
    if (purchases !== undefined) form.purchases = Number(purchases) || 0;
    if (cashCollection !== undefined)
      form.cashCollection = Number(cashCollection) || 0;
    if (bankMada !== undefined) form.bankMada = Number(bankMada) || 0;
    if (bankVisa !== undefined) form.bankVisa = Number(bankVisa) || 0;
    if (actualSales !== undefined)
      form.actualSales = Number(actualSales) || 0;
    if (notes !== undefined) form.notes = String(notes || "");

    if (Array.isArray(applications))
      form.applications = await buildLinesFromTemplates(
        applications,
        "applications"
      );
    if (Array.isArray(bankCollections))
      form.bankCollections = await buildLinesFromTemplates(
        bankCollections,
        "bank"
      );

    await form.save();

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" },
    ]);

    return res.json(mapOut(populated));
  } catch (error) {
    console.error("❌ updateForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};
// 🔵 Release المحاسب — نسخة نهائية آمنة ضد undefined أو body فاضي
const releaseForm = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ ضمان إن req.body موجود حتى لو الريكوست مبعتهوش من الواجهة
    const body = req.body || {};
    const note = body.note || "";

    // ✅ جلب الفورم من قاعدة البيانات
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    // ✅ تأمين الحقول ضد undefined (لو الفورم قديم أو ناقص)
    form.accountantRelease = form.accountantRelease || { status: "pending", note: "" };
    form.branchManagerRelease = form.branchManagerRelease || { status: "pending", note: "" };
    form.adminRelease = form.adminRelease || { status: "pending", note: "" };

    // ✅ تحديث حالة المحاسب
    form.accountantRelease.status = "released";
    form.accountantRelease.by = req.user?._id || null;
    form.accountantRelease.at = new Date();
    form.accountantRelease.note = note;

    // ✅ تحديث الحالة العامة للفورم
    form.status = "released";

    // ✅ حفظ البيانات بعد التعديل
    await form.save();

    // ✅ إعادة الفورم بالبيانات المعبأة
    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" }
    ]);

    return res.json({
      message: "Form released by accountant ✅",
      form: mapOut(populated)
    });

  } catch (error) {
    console.error("❌ releaseForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};



// 🔴 Reject المحاسب
const rejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;

    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (!form.accountantRelease || typeof form.accountantRelease !== "object") {
      form.accountantRelease = {};
    }

    form.accountantRelease.status = "rejected";
    form.accountantRelease.by = req.user?._id || null;
    form.accountantRelease.at = new Date();
    form.accountantRelease.note = String(note || "");
    form.status = "rejected";

    await form.save();

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" },
    ]);
    return res.json({
      message: "Form rejected successfully",
      form: mapOut(populated),
    });
  } catch (error) {
    console.error("❌ rejectForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟣 Release مدير الفرع
const branchManagerReleaseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;

    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res
        .status(400)
        .json({ message: "يجب عمل Release من المحاسب أولًا" });
    }

    if (!form.branchManagerRelease || typeof form.branchManagerRelease !== "object") {
      form.branchManagerRelease = {};
    }

    form.branchManagerRelease.status = "released";
    form.branchManagerRelease.by = req.user?._id || null;
    form.branchManagerRelease.at = new Date();
    form.branchManagerRelease.note = String(note || "");
    form.status = "released";

    await form.save();

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" },
    ]);
    return res.json({
      message: "Form released by branch manager",
      form: mapOut(populated),
    });
  } catch (error) {
    console.error("❌ branchManagerReleaseForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟣 Reject مدير الفرع
const branchManagerRejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;

    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res
        .status(400)
        .json({ message: "يجب عمل Release من المحاسب أولًا" });
    }

    if (!note || !note.trim()) {
      return res
        .status(400)
        .json({ message: "سبب الرفض مطلوب من مدير الفرع" });
    }

    if (!form.branchManagerRelease || typeof form.branchManagerRelease !== "object") {
      form.branchManagerRelease = {};
    }

    form.branchManagerRelease.status = "rejected";
    form.branchManagerRelease.by = req.user?._id || null;
    form.branchManagerRelease.at = new Date();
    form.branchManagerRelease.note = String(note || "");

    form.accountantRelease.status = "pending";
    form.accountantRelease.returnReason = note;
    form.status = "rejected_by_manager";

    await form.save();

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" },
    ]);
    return res.json({
      message: "Form rejected by branch manager and returned to accountant",
      form: mapOut(populated),
    });
  } catch (error) {
    console.error("❌ branchManagerRejectForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟢 إعادة إرسال بعد رفض المدير
const resubmitForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (
      form.branchManagerRelease?.status !== "rejected" &&
      form.status !== "rejected_by_manager"
    ) {
      return res
        .status(400)
        .json({ message: "Form is not rejected by branch manager" });
    }

    const {
      pettyCash,
      purchases,
      cashCollection,
      bankMada,
      bankVisa,
      actualSales,
      notes,
      applications,
      bankCollections,
    } = req.body;

    if (pettyCash !== undefined) form.pettyCash = Number(pettyCash) || 0;
    if (purchases !== undefined) form.purchases = Number(purchases) || 0;
    if (cashCollection !== undefined)
      form.cashCollection = Number(cashCollection) || 0;
    if (bankMada !== undefined) form.bankMada = Number(bankMada) || 0;
    if (bankVisa !== undefined) form.bankVisa = Number(bankVisa) || 0;
    if (actualSales !== undefined)
      form.actualSales = Number(actualSales) || 0;
    if (notes !== undefined) form.notes = String(notes || "");

    if (Array.isArray(applications))
      form.applications = await buildLinesFromTemplates(
        applications,
        "applications"
      );
    if (Array.isArray(bankCollections))
      form.bankCollections = await buildLinesFromTemplates(
        bankCollections,
        "bank"
      );

    form.accountantRelease.status = "released";
    form.branchManagerRelease.status = "pending";
    form.branchManagerRelease.note = "";
    form.status = "resubmitted";
    form.updatedAt = new Date();

    await form.save();

    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" },
    ]);

    return res.json({
      message: "Form re-submitted to branch manager successfully ✅",
      form: mapOut(populated),
    });
  } catch (error) {
    console.error("❌ resubmitForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔵 Release الأدمن
const adminReleaseForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "", receivedCash, receivedApps, receivedBank } = req.body;

    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من المحاسب أولًا" });
    }
    if (form.branchManagerRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من مدير الفرع أولًا" });
    }

    const fallbackCash = Number(form.cashCollection || 0);
    const fallbackApps = (form.applications || []).reduce((s, a) => s + Number(a?.amount || 0), 0);
    const fallbackBank = (form.bankCollections || []).reduce((s, b) => s + Number(b?.amount || 0), 0);

    form.adminRelease = { status: "released", by: req.user._id, at: new Date() };
    form.adminNote = String(note || "");

    form.receivedCash = receivedCash !== undefined ? Number(receivedCash) || 0 : fallbackCash;
    form.receivedApps = receivedApps !== undefined ? Number(receivedApps) || 0 : fallbackApps;
    form.receivedBank = receivedBank !== undefined ? Number(receivedBank) || 0 : fallbackBank;

    form.status = "released";
    await form.save();

    const populated = await form.populate([{ path: "branch", select: "name" }, { path: "user", select: "name" }]);
    return res.json({ message: "Form released by admin", form: mapOut(populated) });
  } catch (error) {
    console.error("❌ adminReleaseForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔵 Reject الأدمن
// 🔵 Reject الأدمن — يرجّع التقرير لمدير الفرع
const adminRejectForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { note = "" } = req.body;

    const form = await Form.findById(id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    // لازم يكون فيه release من المحاسب ومدير الفرع
    if (form.accountantRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من المحاسب أولًا" });
    }
    if (form.branchManagerRelease?.status !== "released") {
      return res.status(400).json({ message: "يجب عمل Release من مدير الفرع أولًا" });
    }

    // 1) تحديث حالة الأدمن
    form.adminRelease = {
      status: "rejected",
      by: req.user._id,
      at: new Date(),
      note: String(note || "")
    };

    // 2) رجّع التقرير لمدير الفرع
    form.branchManagerRelease.status = "pending";
    form.branchManagerRelease.note = "";
    form.branchManagerRelease.at = null;

    // 3) حفظ سبب الرفض العام
    form.rejectionReason = String(note || "");

    // 4) تحديث الحالة العامة
    form.status = "rejected_by_admin";

    await form.save();

    // populate
    const populated = await form.populate([
      { path: "branch", select: "name" },
      { path: "user", select: "name" }
    ]);

    return res.json({
      message: "Form rejected by admin and returned to branch manager",
      form: mapOut(populated),
    });

  } catch (error) {
    console.error("❌ adminRejectForm error:", error);
    return res.status(500).json({ message: error.message });
  }
};



// 🟡 عرض فورماتي الخاصة بالمستخدم
const getMyForms = async (req, res) => {
  try {
    const forms = await Form.find({ user: req.user._id })
      .sort({ formDate: -1 })
      .populate("branch", "name")
      .populate("user", "name");

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("❌ getMyForms error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟠 قائمة للمراجعة (للمحاسبين)
const listFormsForReview = async (req, res) => {
  try {
    const {
      branches,
      startDate,
      endDate,
      statuses,
      accountantStatus,
      q = "",
    } = req.query;

    const filters = {};

    // ✅ إذا كان المستخدم محاسبًا، نقوم بتصفية الفروع بناءً على assignedBranches
    if (req.user.role === "Accountant" && req.user.assignedBranches.length > 0) {
      filters.branch = { $in: req.user.assignedBranches };  // فقط الفروع المخصصة للمحاسب
    } else if (branches) {
      const arr = Array.isArray(branches) ? branches : branches.split(",");
      filters.branch = { $in: arr }; // دعم اختيار أكتر من فرع
    }

    // ✅ التاريخ
    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }

    // ✅ أكتر من حالة
    const effectiveStatuses = accountantStatus || statuses;
    if (effectiveStatuses) {
      const arr = Array.isArray(effectiveStatuses)
        ? effectiveStatuses
        : effectiveStatuses.split(",");
      filters["accountantRelease.status"] = { $in: arr };
    }

    // ✅ بحث بالكلمة
    const or = [];
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      or.push({ notes: rx });
    }

    const query = or.length ? { $and: [filters, { $or: or }] } : filters;
    const forms = await Form.find(query)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ formDate: -1, createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("❌ listFormsForReview error:", error);
    return res.status(500).json({ message: error.message });
  }
};


// 🔵 عرض فورمات الأدمن
const listFormsForAdmin = async (req, res) => {
  try {
    const { branchId, startDate, endDate, q = "", adminStatus = "" } =
      req.query;

    const filters = {
      "accountantRelease.status": "released",
      "branchManagerRelease.status": "released",
    };

    if (branchId) filters.branch = branchId;

    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }

    if (adminStatus) filters["adminRelease.status"] = adminStatus;

    const or = [];
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      or.push({ notes: rx });
    }

    const query = or.length ? { $and: [filters, { $or: or }] } : filters;

    const forms = await Form.find(query)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ formDate: -1, createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("❌ listFormsForAdmin error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🟣 عرض فورمات مدير الفرع
const listFormsForBranchManager = async (req, res) => {
  try {
    const { startDate, endDate, q = "" } = req.query;
    const filters = { "accountantRelease.status": "released" };

    filters.branch = { $in: req.user.assignedBranches || [] };

    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }

    const or = [];
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      or.push({ notes: rx });
    }

    const query = or.length ? { $and: [filters, { $or: or }] } : filters;

    const forms = await Form.find(query)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ formDate: -1, createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("❌ listFormsForBranchManager error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ⚙️ عرض كل الفورمات (للأدمن فقط)
const listAllForms = async (req, res) => {
  try {
    const { branchId, userId, startDate, endDate, q = "", status = "" } =
      req.query;
    const filters = {};

    if (branchId) filters.branch = branchId;
    if (userId) filters.user = userId;

    if (startDate || endDate) {
      filters.formDate = {};
      if (startDate) filters.formDate.$gte = new Date(startDate);
      if (endDate) filters.formDate.$lte = new Date(endDate);
    }

    if (status) {
      if (status === "pending") {
        filters["accountantRelease.status"] = { $ne: "released" };
      } else if (status === "waitingBranch") {
        filters["accountantRelease.status"] = "released";
        filters["branchManagerRelease.status"] = { $ne: "released" };
      } else if (status === "released") {
        filters["adminRelease.status"] = "released";
      } else if (status === "rejected") {
        filters.status = "rejected";
      }
    }

    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filters.notes = rx;
    }

    const forms = await Form.find(filters)
      .populate("branch", "name")
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return res.json(forms.map(mapOut));
  } catch (error) {
    console.error("❌ listAllForms error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🔥 حذف نهائي
const deleteFormPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Form.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Form not found" });

    return res.json({ message: "Form deleted permanently ✅" });
  } catch (error) {
    console.error("❌ deleteFormPermanently error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 🧩 تصدير شامل
module.exports = {
  createForm,
  updateForm,
  getMyForms,
  releaseForm,
  rejectForm,
  branchManagerReleaseForm,
  branchManagerRejectForm,
  resubmitForm,
  adminReleaseForm,
  adminRejectForm,
  listFormsForReview,
  listFormsForAdmin,
  listFormsForBranchManager,
  listAllForms,
  deleteFormPermanently,
  mapOut,
};
