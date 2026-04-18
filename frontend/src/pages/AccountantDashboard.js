// src/pages/AccountantDashboard.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import ReportTimeline from "../components/ui/ReportTimeline";

import {
  LogOut,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  LayoutGrid,
  Download,
  Plus,
  Minus,
  Edit3,
  Save,
  RotateCcw,
  X,
  ChevronDown,
  Info,
  RefreshCw,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { BrandPageStyle } from "./brandTheme";

/* ================= Helpers ================= */
const currency = (n) => Number(n || 0).toLocaleString();
const formatDateOnly = (d) => (d ? new Date(d).toLocaleDateString() : "-");
const sumAppsArr = (f) =>
  (f?.applications || []).reduce((s, a) => s + Number(a?.amount || 0), 0);
const sumBankArr = (f) =>
  (f?.bankCollections || []).reduce((s, b) => s + Number(b?.amount || 0), 0);
const appsWithFallback = (f) => {
  const arr = sumAppsArr(f);
  return arr > 0 ? arr : Number(f?.appsTotal || f?.appsCollection || 0);
};
const bankWithFallback = (f) => {
  const arr = sumBankArr(f);
  return arr > 0 ? arr : Number(f?.bankTotal || 0);
};
const salesOnlyTotal = (f) =>
  Number(f?.cashCollection || 0) + appsWithFallback(f) + bankWithFallback(f);
const grandWithPurchases = (f) =>
  salesOnlyTotal(f) + Number(f?.purchases || 0);

/* ================= Component ================= */
export default function AccountantDashboard() {
  const api = useApi();
  const meName = localStorage.getItem("userName") || "محاسب";

  /* ---------- Tabs ---------- */
  const tabs = [
    { key: "pending", label: "قيد المراجعة", color: "amber", icon: <Clock3 size={16} /> },
    { key: "approved", label: "تم الاعتماد", color: "emerald", icon: <CheckCircle2 size={16} /> },
    { key: "rejected", label: "تم الرفض", color: "rose", icon: <XCircle size={16} /> },
    { key: "all", label: "الكل (تحليل)", color: "gray", icon: <LayoutGrid size={16} /> },
  ];
  const [tab, setTab] = useState("pending");

  /* ---------- Data ---------- */
  const [branches, setBranches] = useState([]);
  const [forms, setForms] = useState([]);

  // templates (admin DB): names for filters
  const [bankTemplates, setBankTemplates] = useState([]);     // [{_id,name}]
  const [appTemplates, setAppTemplates] = useState([]);       // [{_id,name}]

  /* ---------- Filters (multi) ---------- */
  const [filters, setFilters] = useState({
    branchIds: [],    // multi
    startDate: "",
    endDate: "",
    q: "",
    bankNames: [],    // multi
    appNames: [],     // multi
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  /* ---------- Details / Edit & Resubmit ---------- */
  const [selectedForm, setSelectedForm] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attLoading, setAttLoading] = useState(false);

  const [canEdit, setCanEdit] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [resubmitNote, setResubmitNote] = useState("");

  // PDF
  const modalRef = useRef(null);

  // ✅ Action modal states (Approve / Reject with textarea)
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | null
  const [actionNote, setActionNote] = useState("");
  const [actionTargetId, setActionTargetId] = useState(null);

  /* ---------- Approve/Reject Actions ---------- */
  // ✅ بدون prompt — بياخد الملاحظة من المودال
  const handleApprove = async (id, note = "") => {
    try {
      await api.patch(`/api/forms/${id}/release`, { note });
      toast.success("تمت الموافقة على التقرير ✅");

      // تحديث المودال لو مفتوح
      if (selectedForm && selectedForm._id === id) {
        setSelectedForm((prev) => {
          if (!prev) return prev;
          const prevAcc = prev.accountantRelease || {};
          return {
            ...prev,
            accountantRelease: {
              ...prevAcc,
              status: "released",
              note, // فاضية لو المستخدم ما كتبش
            },
          };
        });
      }

      await fetchForms();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "تعذر تنفيذ الموافقة");
    }
  };

  // ❌ الرفض: السبب إجباري — بدون prompt
  const handleReject = async (id, note = "") => {
    const clean = String(note || "").trim();
    if (!clean) {
      toast.error("سبب الرفض مطلوب");
      return;
    }
    try {
      await api.patch(`/api/forms/${id}/reject`, { note: clean });
      toast.error("تم رفض التقرير 🚫");

      // تحديث المودال لو التقرير المفتوح هو نفسه المرفوض
      if (selectedForm && selectedForm._id === id) {
        setSelectedForm((prev) => {
          if (!prev) return prev;
          const prevAcc = prev.accountantRelease || {};
          return {
            ...prev,
            accountantRelease: {
              ...prevAcc,
              status: "rejected",
              note: clean,
            },
          };
        });
      }

      await fetchForms();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "تعذر تنفيذ الرفض (تحقق من سبب الرفض)");
    }
  };

  /* ---------- Load branches + templates ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [bRes] = await Promise.all([api.get("/api/branches")]);
        setBranches(bRes.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [api]);

  // Fetch admin templates (applications/bank). If API unavailable, fallback later from forms.
  const fetchTemplates = async () => {
    try {
      const appsTry = await api.get("/api/report-templates", { params: { group: "applications", isActive: true } });
      const bankTry = await api.get("/api/report-templates", { params: { group: "bank", isActive: true } });
      setAppTemplates((appsTry.data || []).map(t => ({ _id: t._id, name: t.name })).filter(x => x.name));
      setBankTemplates((bankTry.data || []).map(t => ({ _id: t._id, name: t.name })).filter(x => x.name));
    } catch {
      // fallback from forms later
      setAppTemplates([]);
      setBankTemplates([]);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Fetch forms ---------- */
  const fetchForms = async () => {
    setLoading(true);
    try {
      // الباك اند (listFormsForReview) بيدعم multiple branches عبر "branches"
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.q) params.q = filters.q;
      if (filters.branchIds?.length) params.branches = filters.branchIds.join(",");

      const res = await api.get("/api/forms/review", { params });
      const data = res.data || [];

      // لو التمبلتس فاضية من API، هنبني distinct names من الداتا:
      if (appTemplates.length === 0 || bankTemplates.length === 0) {
        const appSet = new Set(appTemplates.map(x => x.name));
        const bankSet = new Set(bankTemplates.map(x => x.name));
        data.forEach(f => {
          (f.applications || []).forEach(a => a?.name && appSet.add(a.name));
          (f.bankCollections || []).forEach(b => b?.name && bankSet.add(b.name));
        });
        if (appTemplates.length === 0) {
          setAppTemplates(Array.from(appSet).filter(Boolean).map(n => ({ _id: n, name: n })));
        }
        if (bankTemplates.length === 0) {
          setBankTemplates(Array.from(bankSet).filter(Boolean).map(n => ({ _id: n, name: n })));
        }
      }

      setForms(data);
      setErrorMsg("");
    } catch (err) {
      console.error(err);
      setErrorMsg("تعذّر تحميل البيانات");
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.q, JSON.stringify(filters.branchIds)]);

  /* ---------- Client filtering by tab + bank/app names ---------- */
  const filteredForms = useMemo(() => {
    let result = [...forms];

    // branches (safety)
    if (filters.branchIds?.length) {
      const setIds = new Set(filters.branchIds);
      result = result.filter((f) => f.branch?._id && setIds.has(f.branch._id));
    }

    // bank methods (multi)
    if (filters.bankNames?.length) {
      const names = new Set(filters.bankNames.map((x) => String(x).toLowerCase()));
      result = result.filter((f) =>
        (f.bankCollections || []).some((b) => names.has(String(b?.name || "").toLowerCase()))
      );
    }

    // app methods (multi)
    if (filters.appNames?.length) {
      const names = new Set(filters.appNames.map((x) => String(x).toLowerCase()));
      result = result.filter((f) =>
        (f.applications || []).some((a) => names.has(String(a?.name || "").toLowerCase()))
      );
    }

    // tab
    if (tab === "pending") {
      result = result.filter((f) => (f.accountantRelease?.status || "pending") === "pending");
    } else if (tab === "approved") {
      result = result.filter((f) => f.branchManagerRelease?.status === "released");
    } else if (tab === "rejected") {
      result = result.filter(
        (f) => f.branchManagerRelease?.status === "rejected" || f.status === "rejected_by_manager"
      );
    }

    // sort desc by date then createdAt
    result.sort((a, b) => {
      const aD = new Date(a.formDate || 0).getTime();
      const bD = new Date(b.formDate || 0).getTime();
      if (aD !== bD) return bD - aD;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [forms, tab, filters.branchIds, filters.bankNames, filters.appNames]);

  /* ---------- Pagination ---------- */
  const totalPages = Math.ceil(filteredForms.length / pageSize);
  const paginatedForms = filteredForms.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, JSON.stringify(filters)]);

  /* ---------- Totals (reflect filtered list + tab) ---------- */
  const totals = useMemo(() => {
    return filteredForms.reduce(
      (acc, f) => {
        const cash = Number(f?.cashCollection || 0);
        const apps = appsWithFallback(f);
        const bank = bankWithFallback(f);
        const purchases = Number(f?.purchases || 0);
        acc.cash += cash;
        acc.apps += apps;
        acc.bank += bank;
        acc.salesOnly += cash + apps + bank;
        acc.salesPlusPurchases += cash + apps + bank + purchases;
        return acc;
      },
      { cash: 0, apps: 0, bank: 0, salesOnly: 0, salesPlusPurchases: 0 }
    );
  }, [filteredForms]);

  /* ---------- Attachments ---------- */
  const fetchAttachments = async (formId) => {
    setAttLoading(true);
    try {
      const res = await api.get(`/api/documents/${formId}`);
      setAttachments(res.data || []);
    } catch (e) {
      console.error(e);
      setAttachments([]);
    } finally {
      setAttLoading(false);
    }
  };

  /* ---------- Details + Edit for manager-rejected ---------- */
  const openDetails = (f) => {
    setSelectedForm(f);
    setEditMode(false);
    setResubmitNote("");
    const rejected = f.branchManagerRelease?.status === "rejected" || f.status === "rejected_by_manager";
    setCanEdit(Boolean(rejected));
    setEditForm({
      pettyCash: Number(f?.pettyCash || 0),
      purchases: Number(f?.purchases || 0),
      cashCollection: Number(f?.cashCollection || 0),
      applications: (f?.applications || []).map((a) => ({
        name: a.name || "",
        amount: Number(a?.amount || 0),
        template: a.template || a.templateId || null,
      })),
      bankCollections: (f?.bankCollections || []).map((b) => ({
        name: b.name || "",
        amount: Number(b?.amount || 0),
        template: b.template || b.templateId || null,
      })),
      bankMada: Number(f?.bankMada || 0),
      bankVisa: Number(f?.bankVisa || 0),
      actualSales: Number(f?.actualSales || 0),
      notes: f?.notes || "",
    });
    fetchAttachments(f._id);
  };

  const closeDetails = () => {
    setSelectedForm(null);
    setAttachments([]);
    setEditMode(false);
    setResubmitNote("");
    setEditForm(null);
  };

  const setEditVal = (key, val) => setEditForm((p) => ({ ...p, [key]: val }));

  const addAppLine = () =>
    setEditForm((p) => ({
      ...p,
      applications: [...(p.applications || []), { name: "", amount: 0 }],
    }));
  const removeAppLine = (idx) =>
    setEditForm((p) => ({
      ...p,
      applications: (p.applications || []).filter((_, i) => i !== idx),
    }));
  const changeAppLine = (idx, key, val) =>
    setEditForm((p) => {
      const arr = [...(p.applications || [])];
      arr[idx] = { ...arr[idx], [key]: key === "amount" ? Number(val) || 0 : val };
      return { ...p, applications: arr };
    });

  const addBankLine = () =>
    setEditForm((p) => ({
      ...p,
      bankCollections: [...(p.bankCollections || []), { name: "", amount: 0 }],
    }));
  const removeBankLine = (idx) =>
    setEditForm((p) => ({
      ...p,
      bankCollections: (p.bankCollections || []).filter((_, i) => i !== idx),
    }));
  const changeBankLine = (idx, key, val) =>
    setEditForm((p) => {
      const arr = [...(p.bankCollections || [])];
      arr[idx] = { ...arr[idx], [key]: key === "amount" ? Number(val) || 0 : val };
      return { ...p, bankCollections: arr };
    });

  const resubmit = async () => {
    if (!selectedForm) return;
    if (!resubmitNote.trim()) {
      toast.error("اكتب ملاحظة للمراجعة (إجباري)");
      return;
    }
    try {
      const payload = {
        pettyCash: Number(editForm.pettyCash || 0),
        purchases: Number(editForm.purchases || 0),
        cashCollection: Number(editForm.cashCollection || 0),
        bankMada: Number(editForm.bankMada || 0),
        bankVisa: Number(editForm.bankVisa || 0),
        actualSales: Number(editForm.actualSales || 0),
        notes: String(editForm.notes || ""),
        applications: (editForm.applications || []).map((x) => ({
          name: x.name,
          amount: Number(x.amount || 0),
          templateId: x.template || x.templateId || undefined,
        })),
        bankCollections: (editForm.bankCollections || []).map((x) => ({
          name: x.name,
          amount: Number(x.amount || 0),
          templateId: x.template || x.templateId || undefined,
        })),
        note: resubmitNote.trim(),
      };

      const res = await api.patch(`/api/forms/${selectedForm._id}/resubmit`, payload);
      toast.success("تم الإرسال للمدير بعد التعديل ✅");

      await fetchForms();
      setSelectedForm(res.data?.form || res.data);
      setEditMode(false);
      setCanEdit(false);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "تعذّر إعادة الإرسال");
    }
  };

  /* ---------- PDF Export (modal content) ---------- */
  const handleExportPDF = async () => {
    try {
      const el = modalRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      const name = `form-${selectedForm?.branch?.name || "branch"}-${(selectedForm?.formDate || "").slice(0, 10)}.pdf`;
      pdf.save(name);
    } catch (err) {
      console.error(err);
      toast.error("تعذّر تصدير الـ PDF");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="brand-app min-h-screen">
      <BrandPageStyle />
      <Toaster position="top-center" toastOptions={{ duration: 2600 }} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur brand-shell border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-logo-badge" />
            <div>
              <p className="text-xs text-gray-500">لوحة المحاسب</p>
              <h1 className="text-lg font-bold tracking-tight">مراجعة تقارير الفروع</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">
              مرحباً، <b>{meName}</b>
            </span>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl brand-primary-btn hover:bg-black transition shadow"
            >
              <LogOut size={16} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tips */}
        <div className="mb-4 flex items-center gap-2 text-gray-700">
          <Info size={16} className="opacity-60" />
          <span className="text-sm">
            كل الكروت والجداول تتأثر بالفلاتر وبالتاب الحالي. تقدر تختار فروع متعددة + فلترة بطرق البنك/التطبيقات.
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition flex items-center gap-2
                ${tab === t.key ? `bg-${t.color}-600 text-white` : "bg-white hover:bg-slate-100/80 text-gray-700"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Summary Cards */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard title="عدد التقارير" value={filteredForms.length} tint="from-gray-500 to-gray-700" />
          <StatCard title="نقدي" value={currency(totals.cash)} tint="from-sky-400 to-yellow-500" />
          <StatCard title="تطبيقات" value={currency(totals.apps)} tint="from-sky-400 to-blue-500" />
          <StatCard title="بنك" value={currency(totals.bank)} tint="from-indigo-500 to-violet-600" />
          <StatCard title="إجمالي المبيعات" value={currency(totals.salesOnly)} tint="from-emerald-500 to-green-600" />
        </section>

        {/* Filters (sticky card with horizontal scroll) */}
        <section className="brand-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={16} />
              <b>فلاتر البحث</b>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilters({
                    branchIds: [],
                    startDate: "",
                    endDate: "",
                    q: "",
                    bankNames: [],
                    appNames: [],
                  });
                }}
                className="text-xs px-2 py-1 rounded-lg border hover:bg-slate-50/80 inline-flex items-center gap-1"
              >
                <RotateCcw size={14} /> تصفير الفلاتر
              </button>
              <button
                onClick={() => fetchForms()}
                className="text-xs px-2 py-1 rounded-lg border hover:bg-slate-50/80 inline-flex items-center gap-1"
                title="تحديث البيانات من الخادم"
              >
                <RefreshCw size={14} /> تحديث
              </button>
            </div>
          </div>

          <div className="overflow-x-auto brand-table-wrap brand-scroll">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-w-[800px]">
              {/* q search */}
              <div className="md:col-span-3 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
                <Search size={16} className="text-gray-400" />
                <input
                  value={filters.q}
                  onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                  className="outline-none w-full text-sm"
                  placeholder="بحث بالكلمات (ملاحظات/مستخدم/فرع)…"
                />
              </div>

              {/* multi-branch select */}
              <div className="md:col-span-3">
                <MultiBranchSelect
                  branches={branches}
                  value={filters.branchIds}
                  onChange={(ids) => setFilters((p) => ({ ...p, branchIds: ids }))}
                />
              </div>

              {/* bank methods multi-select */}
              <div className="md:col-span-3">
                <SimpleMultiSelect
                  label="طرق البنك"
                  options={bankTemplates}
                  value={filters.bankNames}
                  onChange={(names) => setFilters((p) => ({ ...p, bankNames: names }))}
                  placeholder="حدد طرق البنك"
                />
              </div>

              {/* app methods multi-select */}
              <div className="md:col-span-3">
                <SimpleMultiSelect
                  label="طرق التطبيقات"
                  options={appTemplates}
                  value={filters.appNames}
                  onChange={(names) => setFilters((p) => ({ ...p, appNames: names }))}
                  placeholder="حدد طرق التطبيقات"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
                  className="border rounded-xl px-3 py-2 bg-white text-sm w-full"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
                  className="border rounded-xl px-3 py-2 bg-white text-sm w-full"
                />
              </div>

              {/* quick actions */}
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button
                  onClick={fetchForms}
                  className="brand-primary-btn px-4 py-2 rounded-xl hover:opacity-95 transition"
                >
                  تحديث
                </button>
              </div>
            </div>
          </div>

          {errorMsg && <div className="mt-3 text-red-600 text-sm">{errorMsg}</div>}

          {/* Selected tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            <TagList label="فروع" values={filters.branchIds.map(id => branches.find(b => b._id === id)?.name).filter(Boolean)} />
            <TagList label="بنك" values={filters.bankNames} />
            <TagList label="تطبيقات" values={filters.appNames} />
          </div>
        </section>

        {/* Table */}
<section className="brand-card p-4">
  <div className="overflow-x-auto brand-table-wrap brand-scroll">
    <table className="min-w-full text-sm border rounded-xl overflow-hidden">
      <thead className="bg-slate-100/80">
        <tr className="text-center">
          <th className="p-2 border">رقم التقرير</th>
          <th className="p-2 border">التاريخ</th>
          <th className="p-2 border">الفرع</th>
          <th className="p-2 border">المستخدم</th>
          <th className="p-2 border">نقدي</th>
          <th className="p-2 border">تطبيقات</th>
          <th className="p-2 border">بنك</th>
          <th className="p-2 border">المشتريات</th>
          <th className="p-2 border">إجمالي البيع</th>
          <th className="p-2 border">اعتماد المحاسب</th>
          <th className="p-2 border">حالة المدير</th>
          <th className="p-2 border">ملاحظات المدير</th>
          <th className="p-2 border">إجراءات</th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={13} className="p-6 text-center text-gray-500 italic">
              جاري تحميل البيانات...
            </td>
          </tr>
        ) : paginatedForms.length ? (
          paginatedForms.map((f) => {
            const accountantStatus = f.accountantRelease?.status || "pending";
            const mgrStatus = f.branchManagerRelease?.status;

            const rowBg =
              accountantStatus === "rejected" || mgrStatus === "rejected"
                ? "bg-red-50"
                : accountantStatus === "released"
                ? "bg-green-50"
                : "bg-yellow-50";

            const showActions = accountantStatus === "pending";

            return (
              <tr key={f._id} className={`text-center ${rowBg}`}>

                {/* 🔢 رقم التقرير */}
                <td className="p-2 border font-mono text-xs font-semibold text-indigo-700">
                  {f.serialNumber || "-"}
                </td>

                {/* 📅 التاريخ + وقت الإنشاء */}
<td className="p-2 border">
  <div className="flex flex-col items-center leading-tight">
    {/* 📅 تاريخ التقرير */}
    <span className="font-medium">
      {formatDateOnly(f.formDate)}
    </span>

    {/* ⏰ وقت الإنشاء فقط */}
    <span className="text-[11px] text-gray-500">
      {f.createdAt
        ? new Date(f.createdAt).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-"}
    </span>
  </div>
</td>


                {/* 🏢 الفرع */}
                <td className="p-2 border">{f.branch?.name || "-"}</td>

                {/* 👤 المستخدم */}
                <td className="p-2 border">{f.user?.name || "-"}</td>

                {/* 💰 أرقام */}
                <td className="p-2 border text-right">{currency(f.cashCollection)}</td>
                <td className="p-2 border text-right">{currency(appsWithFallback(f))}</td>
                <td className="p-2 border text-right">{currency(bankWithFallback(f))}</td>
                <td className="p-2 border text-right">{currency(f.purchases)}</td>

                {/* 📊 إجمالي */}
                <td className="p-2 border font-bold text-right">
                  {currency(salesOnlyTotal(f))}
                </td>

                {/* ✅ اعتماد المحاسب */}
<td className="p-2 border">
  {accountantStatus === "released" ? (
    <div className="flex flex-col items-center gap-0.5">
      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-blue-800">
        معتمد
      </span>
      <span className="text-[11px] text-gray-500">
        {f.accountantRelease?.at
          ? new Date(f.accountantRelease.at).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-"}
      </span>
    </div>
  ) : accountantStatus === "rejected" ? (
    <div className="flex flex-col items-center gap-0.5">
      <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-blue-800">
        مرفوض
      </span>
      <span className="text-[11px] text-gray-500">
        {f.accountantRelease?.at
          ? new Date(f.accountantRelease.at).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-"}
      </span>
    </div>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-blue-800">
      قيد المراجعة
    </span>
  )}
</td>


                {/* 👔 اعتماد المدير */}
                <td className="p-2 border">
                  {mgrStatus === "released" ? (
                    <span className="text-blue-700 font-medium">تم الاعتماد</span>
                  ) : mgrStatus === "rejected" ? (
                    <span className="text-blue-700 font-medium">مرفوض</span>
                  ) : (
                    <span className="text-blue-700 font-medium">قيد المراجعة</span>
                  )}
                </td>

                {/* 📝 ملاحظات المدير */}
                <td className="p-2 border whitespace-pre-wrap text-left text-gray-700 max-w-[220px]">
                  {f.branchManagerRelease?.note || "-"}
                </td>

                {/* ⚙️ إجراءات */}
                <td className="p-2 border space-y-1">
                  <button
                    onClick={() => openDetails(f)}
                    className="w-full px-2 py-1 brand-muted-btn text-xs"
                  >
                    تفاصيل
                  </button>

                  {showActions && (
                    <>
                      <button
                        onClick={() => {
                          setActionType("approve");
                          setActionTargetId(f._id);
                          setActionNote("");
                        }}
                        className="w-full px-2 py-1 brand-success-btn rounded hover:bg-blue-800 text-xs"
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => {
                          setActionType("reject");
                          setActionTargetId(f._id);
                          setActionNote("");
                        }}
                        className="w-full px-2 py-1 brand-danger-btn rounded hover:bg-blue-800 text-xs"
                      >
                        رفض
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={13} className="p-6 text-center text-gray-500 italic">
              لا توجد نتائج مطابقة
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>


        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className={`px-3 py-1 rounded-lg border ${
                currentPage === 1 ? "bg-slate-100/80 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-slate-100/80"
              }`}
            >
              السابق
            </button>
            <span className="text-sm text-gray-600">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className={`px-3 py-1 rounded-lg border ${
                currentPage === totalPages ? "bg-slate-100/80 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-slate-100/80"
              }`}
            >
              التالي
            </button>
          </div>
        )}
      </main>

      {/* ===== Modal: Details / Edit + Resubmit ===== */}
      {selectedForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl">
            {/* Header */}
<div className="sticky top-0 bg-white border-b rounded-t-2xl p-4 flex justify-between items-center">
  <div className="space-y-1">
    {/* 🧾 سيريال التقرير */}
    <h3 className="text-base font-bold flex items-center gap-2">
      تقرير رقم
      <span className="text-indigo-600 font-mono">
        {selectedForm.serialNumber || "-"}
      </span>
    </h3>

    {/* 🏢 الفرع + تاريخ التقرير */}
    <div className="text-sm text-gray-700">
      {selectedForm.branch?.name || "-"} — {formatDateOnly(selectedForm.formDate)}
    </div>

    {/* ⏰ توقيتات */}
    {/*<div className="text-xs text-gray-500 space-y-0.5">
      <div>
        تم الإنشاء:
        <span className="ml-1 font-medium">
          {selectedForm.createdAt
            ? new Date(selectedForm.createdAt).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </span>
      </div>

      {selectedForm.accountantRelease?.at && (
        <div>
          اعتماد المحاسب:
          <span className="ml-1 font-medium text-blue-800">
            {new Date(selectedForm.accountantRelease.at).toLocaleTimeString(
              "ar-EG",
              { hour: "2-digit", minute: "2-digit" }
            )}
          </span>
        </div>
      )}
    </div>*/}
  </div>

  <div className="flex gap-2" data-html2canvas-ignore>
    <button
      onClick={handleExportPDF}
      className="px-3 py-1.5 rounded-xl brand-primary-btn hover:bg-black text-sm inline-flex items-center gap-1"
    >
      تصدير PDF
    </button>
    <button
      onClick={closeDetails}
      className="border px-3 py-1.5 rounded-xl hover:bg-slate-50/80 text-sm inline-flex items-center gap-1"
    >
      إغلاق
    </button>
  </div>
</div>


            {/* Body */}
            <div ref={modalRef} className="max-h-[85vh] overflow-y-auto">
              <div className="p-4 sm:p-6 space-y-4">
                {/* Top metrics */}
                <div className="grid md:grid-cols-4 gap-3">
                  <MiniBox label="العهدة" value={currency(selectedForm.pettyCash)} />
                  <MiniBox label="المشتريات" value={currency(selectedForm.purchases)} />
                  <MiniBox label="التحصيل النقدي" value={currency(selectedForm.cashCollection)} />
                  <MiniBox label="إجمالي المبيعات" value={currency(grandWithPurchases(selectedForm))} />
                </div>

                {/* Status notes */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-xl bg-white/70">
                    <div className="text-xs text-gray-500 mb-1">ملاحظات مدير الفرع</div>
                    <div className="text-sm whitespace-pre-wrap">{selectedForm.branchManagerRelease?.note || "-"}</div>
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full border
                        ${selectedForm.branchManagerRelease?.status === "rejected" ? "text-blue-800 border-rose-300 bg-sky-50" :
                          selectedForm.branchManagerRelease?.status === "released" ? "text-blue-800 border-emerald-300 bg-sky-50" :
                            "text-blue-800 border-amber-300 bg-sky-50"}`}>
                        حالة المدير: {selectedForm.branchManagerRelease?.status || "pending"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded-xl bg-white/70">
                    <div className="text-xs text-gray-500 mb-1">ملاحظات المحاسب</div>
                    <div className="text-sm whitespace-pre-wrap">{selectedForm.accountantRelease?.note || "-"}</div>
                    {selectedForm.accountantRelease?.returnReason && (
                      <div className="mt-2 p-2 text-xs rounded-lg bg-yellow-50 border border-yellow-200">
                        <b>سبب الإرجاع:</b> {selectedForm.accountantRelease.returnReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Apps + Bank */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-3 bg-white/70">
                    <div className="font-semibold mb-2">التطبيقات</div>
                    {(selectedForm.applications || []).length ? (
                      <ul className="space-y-1">
                        {selectedForm.applications.map((a, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm gap-2">
                            <span className="truncate">{a.name}</span>
                            <span className="font-semibold">{currency(a.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500">لا يوجد</div>
                    )}
                    <div className="text-right mt-2 font-bold text-blue-800">
                      الإجمالي: {currency(sumAppsArr(selectedForm) || Number(selectedForm?.appsTotal || selectedForm?.appsCollection || 0))}
                    </div>
                  </div>

                  <div className="border rounded-xl p-3 bg-white/70">
                    <div className="font-semibold mb-2">تحصيلات البنك</div>
                    {(selectedForm.bankCollections || []).length ? (
                      <ul className="space-y-1">
                        {selectedForm.bankCollections.map((b, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm gap-2">
                            <span className="truncate">{b.name}</span>
                            <span className="font-semibold">{currency(b.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500">لا يوجد</div>
                    )}
                    <div className="text-right mt-2 font-bold text-blue-700">
                      الإجمالي: {currency(sumBankArr(selectedForm) || Number(selectedForm?.bankTotal || 0))}
                    </div>
                  </div>
                </div>

                {/* Other fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-3 bg-white/70">
                    <div className="text-gray-500 mb-1">ملخصات</div>
                    <div className="grid grid-cols-2 gap-3">
                      <LabeledValue
                        label="إجمالي البيع (بدون مشتريات)"
                        value={currency(salesOnlyTotal(selectedForm))}
                      />
                      <LabeledValue
                        label="إجمالي + مشتريات"
                        value={currency(grandWithPurchases(selectedForm))}
                      />
                      <LabeledValue label="العهدة" value={currency(selectedForm.pettyCash)} />
                      <LabeledValue label="المشتريات" value={currency(selectedForm.purchases)} />
                      <LabeledValue label="نقدي" value={currency(selectedForm.cashCollection)} />
                      <LabeledValue label="Actual Sales" value={currency(selectedForm.actualSales)} />
                    </div>
                  </div>

                  <div className="border rounded-xl p-3 bg-white/70">
                    <div className="text-gray-500 mb-1">ملاحظات</div>
                    <div className="whitespace-pre-wrap text-sm">{selectedForm.notes || "-"}</div>
                  </div>
                </div>

{/* Attachments */}
<div className="mt-1 border rounded-xl p-3 bg-white/70">
  <div className="font-semibold mb-2">📎 المرفقات</div>
  {attLoading ? (
    <div className="text-sm text-gray-500">جاري التحميل...</div>
  ) : attachments.length ? (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {attachments.map((att) => {
        const isImg = att.fileUrl?.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i);
        const href = att.fileUrl?.startsWith("http")
          ? att.fileUrl
          : `${process.env.REACT_APP_API_URL || ""}${att.fileUrl || ""}`;
        return (
          <a
            key={att._id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block border rounded-xl overflow-hidden hover:shadow-md transition"
          >
            {isImg ? (
              <img
                src={href}
                alt={att.type || "attachment"}
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="p-3 text-center text-sm text-gray-600">
                {att.fileUrl?.split("/").pop()}
              </div>
            )}
            <div className="text-xs text-gray-500 text-center p-1 bg-slate-50/80 border-t">
              {att.type?.toUpperCase() || "ملف"}
            </div>
          </a>
        );
      })}
    </div>
  ) : (
    <div className="text-sm text-gray-500">لا توجد مرفقات</div>
  )}
</div>
{/* 🕒 Timeline */}
<div className="px-4 sm:px-6 mt-4">
  <ReportTimeline form={selectedForm} />
</div>



                {/* Edit/Resubmit actions (only if rejected by manager) */}
                {canEdit && (
                  <div className="border rounded-xl p-3 bg-sky-50/70 mt-2" data-html2canvas-ignore>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-amber-800 font-semibold flex items-center gap-2">
                        <Edit3 size={16} />
                        تم رفض التقرير من المدير — يمكنك تعديله وإعادة إرساله
                      </div>
                      <button
                        onClick={() => setEditMode((v) => !v)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border hover:bg-white text-sm"
                      >
                        <ChevronDown size={14} />
                        {editMode ? "إغلاق وضع التعديل" : "فتح وضع التعديل"}
                      </button>
                    </div>

                    {editMode && (
                      <div className="mt-3 space-y-3">
                        {/* Quick legacy fields (اختياري) */}
                        <div className="grid md:grid-cols-4 gap-3">
                          <LabeledValue
                            label="Bank Mada (اختياري)"
                            value={<NumberInput value={editForm.bankMada} onChange={(v) => setEditVal("bankMada", v)} />}
                          />
                          <LabeledValue
                            label="Bank Visa (اختياري)"
                            value={<NumberInput value={editForm.bankVisa} onChange={(v) => setEditVal("bankVisa", v)} />}
                          />
                          <LabeledValue
                            label="Actual Sales"
                            value={<NumberInput value={editForm.actualSales} onChange={(v) => setEditVal("actualSales", v)} />}
                          />
                        </div>

                        {/* Apps + Bank editable */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border rounded-xl p-3 bg-white/70">
                            <div className="font-semibold mb-2">التطبيقات</div>
                            <ul className="space-y-1">
                              {(editForm?.applications || []).map((a, idx) => (
                                <li key={idx} className="flex items-center justify-between text-sm gap-2">
                                  <input
                                    value={a.name}
                                    onChange={(e) => changeAppLine(idx, "name", e.target.value)}
                                    className="border rounded-lg px-2 py-1 w-full"
                                    placeholder="اسم الطريقة"
                                  />
                                  <input
                                    type="number"
                                      step="0.01"
  inputMode="decimal"
                                    value={a.amount}
                                    onChange={(e) => changeAppLine(idx, "amount", e.target.value)}
                                    className="border rounded-lg px-2 py-1 w-32 text-right"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() => removeAppLine(idx)}
                                    className="p-1 rounded-lg border hover:bg-slate-50/80"
                                    title="حذف السطر"
                                  >
                                    <Minus size={14} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <div className="flex justify-between items-center mt-3" data-html2canvas-ignore>
                              <button onClick={addAppLine} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg brand-success-btn text-xs">
                                <Plus size={14} /> إضافة سطر
                              </button>
                              <div className="font-bold text-blue-800 text-sm">
                                الإجمالي: {currency((editForm?.applications || []).reduce((s, x) => s + Number(x.amount || 0), 0))}
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-xl p-3 bg-white/70">
                            <div className="font-semibold mb-2">تحصيلات البنك</div>
                            <ul className="space-y-1">
                              {(editForm?.bankCollections || []).map((b, idx) => (
                                <li key={idx} className="flex items-center justify-between text-sm gap-2">
                                  <input
                                    value={b.name}
                                    onChange={(e) => changeBankLine(idx, "name", e.target.value)}
                                    className="border rounded-lg px-2 py-1 w-full"
                                    placeholder="اسم الطريقة"
                                  />
                                  <input
                                    type="number"
                                      step="0.01"
  inputMode="decimal"
                                    value={b.amount}
                                    onChange={(e) => changeBankLine(idx, "amount", e.target.value)}
                                    className="border rounded-lg px-2 py-1 w-32 text-right"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() => removeBankLine(idx)}
                                    className="p-1 rounded-lg border hover:bg-slate-50/80"
                                    title="حذف السطر"
                                  >
                                    <Minus size={14} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <div className="flex justify-between items-center mt-3" data-html2canvas-ignore>
                              <button onClick={addBankLine} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs">
                                <Plus size={14} /> إضافة سطر
                              </button>
                              <div className="font-bold text-blue-700 text-sm">
                                الإجمالي: {currency((editForm?.bankCollections || []).reduce((s, x) => s + Number(x.amount || 0), 0))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Other editable fields */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border rounded-xl p-3 bg-white/70">
                            <div className="text-gray-500 mb-1">ملخصات</div>
                            <div className="grid grid-cols-2 gap-3">
                              <LabeledValue
                                label="إجمالي البيع (بدون مشتريات)"
                                value={currency(
                                  (Number(editForm.cashCollection || 0)
                                    + (editForm.applications || []).reduce((s, x) => s + Number(x.amount || 0), 0)
                                    + (editForm.bankCollections || []).reduce((s, x) => s + Number(x.amount || 0), 0))
                                )}
                              />
                              <LabeledValue
                                label="إجمالي + مشتريات"
                                value={currency(
                                  (Number(editForm.cashCollection || 0)
                                    + (editForm.applications || []).reduce((s, x) => s + Number(x.amount || 0), 0)
                                    + (editForm.bankCollections || []).reduce((s, x) => s + Number(x.amount || 0), 0)
                                    + Number(editForm.purchases || 0))
                                )}
                              />
                              <LabeledValue
                                label="العهدة"
                                value={<NumberInput value={editForm.pettyCash} onChange={(v) => setEditVal("pettyCash", v)} />}
                              />
                              <LabeledValue
                                label="المشتريات"
                                value={<NumberInput value={editForm.purchases} onChange={(v) => setEditVal("purchases", v)} />}
                              />
                              <LabeledValue
                                label="نقدي"
                                value={<NumberInput value={editForm.cashCollection} onChange={(v) => setEditVal("cashCollection", v)} />}
                              />
                            </div>
                          </div>

                          <div className="border rounded-xl p-3 bg-white/70">
                            <div className="text-gray-500 mb-1">ملاحظة للمُراجع (إجباري لإعادة الإرسال)</div>
                            <textarea
                              value={resubmitNote}
                              onChange={(e) => setResubmitNote(e.target.value)}
                              placeholder="مثلاً: تم تصحيح مبلغ التحصيل البنكي طبقًا للمرفق.."
                              className="w-full border rounded-xl p-3 text-sm min-h-[90px] focus:ring-2 focus:ring-rose-300 outline-none"
                            />
                            <div className="flex flex-col md:items-end gap-2 mt-2" data-html2canvas-ignore>
                              <button
                                onClick={resubmit}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl brand-success-btn hover:bg-blue-800"
                              >
                                <Save size={16} />
                                إرسال مجددًا للمدير
                              </button>
                              <button
                                onClick={() => {
                                  setEditForm({
                                    pettyCash: Number(selectedForm?.pettyCash || 0),
                                    purchases: Number(selectedForm?.purchases || 0),
                                    cashCollection: Number(selectedForm?.cashCollection || 0),
                                    applications: (selectedForm?.applications || []).map((a) => ({
                                      name: a.name || "",
                                      amount: Number(a?.amount || 0),
                                      template: a.template || a.templateId || null,
                                    })),
                                    bankCollections: (selectedForm?.bankCollections || []).map((b) => ({
                                      name: b.name || "",
                                      amount: Number(b?.amount || 0),
                                      template: b.template || b.templateId || null,
                                    })),
                                    bankMada: Number(selectedForm?.bankMada || 0),
                                    bankVisa: Number(selectedForm?.bankVisa || 0),
                                    actualSales: Number(selectedForm?.actualSales || 0),
                                    notes: selectedForm?.notes || "",
                                  });
                                  setResubmitNote("");
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-white"
                              >
                                <RotateCcw size={16} />
                                تراجع عن التعديلات
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ أزرار الموافقة/الرفض في أسفل المودال — فقط لو حالة المحاسب pending */}
                {selectedForm.accountantRelease?.status === "pending" && (
                  <div className="flex justify-end gap-3 mt-4" data-html2canvas-ignore>
                    <button
                      onClick={() => {
                        setActionType("approve");
                        setActionTargetId(selectedForm._id);
                        setActionNote("");
                      }}
                      className="px-4 py-2 rounded-xl brand-success-btn hover:bg-blue-800"
                    >
                      موافقة
                    </button>
                    <button
                      onClick={() => {
                        setActionType("reject");
                        setActionTargetId(selectedForm._id);
                        setActionNote("");
                      }}
                      className="px-4 py-2 rounded-xl brand-danger-btn hover:bg-blue-800"
                    >
                      رفض
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Action Modal: Approve / Reject with Textarea ===== */}
{actionType && (
  <div className="fixed inset-0 z-[3000000000] bg-black/50 flex items-center justify-center p-3">

          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h4 className="font-bold text-base">
                {actionType === "approve" ? "تأكيد الموافقة" : "تأكيد الرفض"}
              </h4>
              <button
                onClick={() => { setActionType(null); setActionNote(""); setActionTargetId(null); }}
                className="p-1 rounded-lg hover:bg-slate-100/80"
                title="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-2">
              <div className="text-sm text-gray-600">
                {actionType === "approve"
                  ? "يمكنك كتابة ملاحظة للموافقة (اختياري)."
                  : "من فضلك اكتب سبب الرفض (إجباري)."}
              </div>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === "approve" ? "أضف ملاحظة (اختياري)..." : "سبب الرفض (إجباري)..."}
                className="w-full border rounded-xl p-3 text-sm min-h-[110px] focus:ring-2 focus:ring-indigo-300 outline-none"
              />
              {actionType === "reject" && !String(actionNote || "").trim() && (
                <div className="text-xs text-blue-700">سبب الرفض مطلوب.</div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
              <button
                onClick={() => { setActionType(null); setActionNote(""); setActionTargetId(null); }}
                className="px-3 py-2 rounded-xl border hover:bg-slate-50/80 text-sm"
              >
                إلغاء
              </button>
              {actionType === "approve" ? (
                <button
                  onClick={async () => {
                    const id = actionTargetId;
                    const note = actionNote;
                    await handleApprove(id, note);
                    setActionType(null);
                    setActionNote("");
                    setActionTargetId(null);
                  }}
                  className="px-3 py-2 rounded-xl brand-success-btn hover:bg-blue-800 text-sm"
                >
                  تأكيد الموافقة
                </button>
              ) : (
                <button
                  disabled={!String(actionNote || "").trim()}
                  onClick={async () => {
                    const id = actionTargetId;
                    const note = actionNote;
                    await handleReject(id, note);
                    setActionType(null);
                    setActionNote("");
                    setActionTargetId(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-white text-sm ${
                    String(actionNote || "").trim()
                      ? "bg-blue-700 hover:bg-blue-800"
                      : "bg-rose-400 cursor-not-allowed"
                  }`}
                >
                  تأكيد الرفض
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Reusable UI ================= */

function StatCard({ title, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
      </div>
    </div>
  );
}

function MiniBox({ label, value }) {
  return (
    <div className="p-3 bg-slate-50/80 rounded-xl text-center">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}

function LabeledValue({ label, value }) {
  return (
    <div className="p-3 bg-slate-50/80 rounded-xl">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className="font-bold text-base mt-1">
        {typeof value === "string" || typeof value === "number" ? value : value}
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, placeholder = "0" }) {
  return (
    <input
      type="number"
        step="0.01"
  inputMode="decimal"
      value={value}
      onChange={(e) => onChange(Number(e.target.value || 0))}
      placeholder={placeholder}
      className="border rounded-xl px-3 py-2 bg-white text-sm w-full text-right"
    />
  );
}

function TagList({ label, values }) {
  if (!values?.length) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}:</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full border bg-white">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ========== Multi selectors ========== */

function MultiBranchSelect({ branches, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(value || []);
  const toggle = (id) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };
  const clearAll = () => onChange([]);

  return (
    <div className="relative">
      <label className="text-xs text-gray-500 block mb-1">الفروع</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border rounded-xl px-3 py-2 bg-white text-sm"
      >
        <span className="truncate">
          {value?.length ? `فروع مختارة (${value.length})` : "اختيار فروع متعددة"}
        </span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-lg border p-2">
          <div className="max-height-56 overflow-auto pr-1 max-h-56">
            {branches.map((b) => {
              const id = b._id;
              const checked = selectedSet.has(id);
              return (
                <label key={id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(id)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm">{b.name}</span>
                </label>
              );
            })}
            {!branches.length && (
              <div className="text-xs text-gray-500 px-2 py-1">لا توجد فروع</div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t mt-2">
            <button type="button" onClick={clearAll} className="text-xs text-blue-700 hover:underline">
              مسح الكل
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-indigo-700 hover:underline">
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleMultiSelect({ label, options, value, onChange, placeholder = "اختر..." }) {
  const [open, setOpen] = useState(false);
  const selected = new Set((value || []).map(v => String(v).toLowerCase()));

  const toggle = (name) => {
    const lower = String(name).toLowerCase();
    const next = new Set(selected);
    if (next.has(lower)) next.delete(lower);
    else next.add(lower);
    onChange([...next]);
  };
  const clearAll = () => onChange([]);

  return (
    <div className="relative">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border rounded-xl px-3 py-2 bg-white text-sm"
      >
        <span className="truncate">
          {value?.length ? `${label}: ${value.length} محدد` : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-lg border p-2">
          <div className="max-h-56 overflow-auto pr-1">
            {(options || []).map((opt) => {
              const name = opt?.name || "";
              const lower = name.toLowerCase();
              const checked = selected.has(lower);
              return (
                <label key={opt._id || name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(name)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm">{name}</span>
                </label>
              );
            })}
            {!options?.length && (
              <div className="text-xs text-gray-500 px-2 py-1">لا توجد عناصر</div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t mt-2">
            <button type="button" onClick={clearAll} className="text-xs text-blue-700 hover:underline">
              مسح الكل
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-indigo-700 hover:underline">
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}