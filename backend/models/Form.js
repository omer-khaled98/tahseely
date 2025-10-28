const mongoose = require("mongoose");

// ✅ عناصر البند التفصيلي (Applications / Bank Collections)
const lineItem = new mongoose.Schema({
  template: { type: mongoose.Schema.Types.ObjectId, ref: "ReportTemplate" },
  name: { type: String, required: true },
  amount: { type: Number, default: 0 }
}, { _id: false });

// ✅ مرفقات متعددة (ملفات)
const attachmentSchema = new mongoose.Schema({
  filename: { type: String },
  path: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

// ✅ النموذج الرئيسي
const formSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  formDate: { type: Date, required: true },

  pettyCash: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  cashCollection: { type: Number, default: 0 },
  bankMada: { type: Number, default: 0 },
  bankVisa: { type: Number, default: 0 },

  actualSales: { type: Number, default: 0 },
  notes: { type: String, default: "" },

  applications: [lineItem],
  bankCollections: [lineItem],

  appsTotal: { type: Number, default: 0 },
  bankTotal: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },

  // ✅ الحالة العامة
  status: {
    type: String,
    enum: [
      "draft",
      "released",
      "rejected",
      "rejected_by_manager",
      "resubmitted"
    ],
    default: "draft"
  },

  // ✅ قسم المحاسب
  accountantRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
    note: { type: String, default: "" },
    returnReason: { type: String, default: "" } // السبب اللي جاي من المدير
  },

  // ✅ قسم مدير الفرع
  branchManagerRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
    note: { type: String, default: "" }
  },

  // ✅ قسم الأدمن
  adminRelease: {
    status: { type: String, enum: ["pending", "released", "rejected"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
    note: { type: String, default: "" }
  },

  adminNote: { type: String, default: "" },
  receivedCash: { type: Number, default: 0 },
  receivedApps: { type: Number, default: 0 },
  receivedBank: { type: Number, default: 0 },

  // ✅ مرفقات البنك أو المستندات
  attachments: [attachmentSchema],

  // ✅ المستخدم اللي راجع أو عدّل آخر مرة
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // ✅ سبب الرفض العام (إن وجد)
  rejectionReason: { type: String, default: "" }

}, { timestamps: true });

// 🧮 دالة مساعدة لحساب المجموع
function sum(arr, key = "amount") {
  return (arr || []).reduce((s, x) => s + (Number(x?.[key]) || 0), 0);
}

// 🧩 قبل الحفظ: حساب الإجماليات تلقائيًا
formSchema.pre("save", function (next) {
  this.appsTotal = sum(this.applications);
  this.bankTotal = sum(this.bankCollections);
  this.totalSales = (this.cashCollection || 0) + this.bankTotal + this.appsTotal;
  next();
});

// 🔍 تحسين البحث والفلاتر
formSchema.index({
  "accountantRelease.status": 1,
  "branchManagerRelease.status": 1,
  "adminRelease.status": 1,
  branch: 1,
  formDate: -1,
  status: 1
});

module.exports = mongoose.model("Form", formSchema);
