// src/pages/BranchManagerDashboard.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import {
  LayoutDashboard,
  LogOut,
  Filter,
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  Download,
  Search,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ===== Chart.js =====
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";
Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  ChartTooltip,
  ChartLegend,
  LineElement,
  PointElement,
  Filler
);

// ===== Helpers =====
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
const rowTotal = (f) => {
  const cash = Number(f?.cashCollection || 0);
  const apps = appsWithFallback(f);
  const bank = bankWithFallback(f);
  const purchases = Number(f?.purchases || 0);
  return cash + apps + bank + purchases;
};

/* =========================================================
   Small UI Primitives
   ========================================================= */
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 transition ${
        active ? "bg-gray-900 text-white shadow" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
function ColorCard({ title, value, color, icon }) {
  return (
    <div
      className={`rounded-2xl p-4 shadow text-white bg-gradient-to-tr ${color} flex items-center justify-between`}
    >
      <div>
        <p className="text-xs">{title}</p>
        <h4 className="text-2xl font-bold">{value}</h4>
      </div>
      {icon ? <div className="opacity-70">{icon}</div> : null}
    </div>
  );
}
function MiniTotal({ title, value }) {
  return (
    <div>
      <div className="text-gray-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
function ChartBox({ title, children }) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}
function StatusPill({ status }) {
  if (status === "released") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Released
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Pending
    </span>
  );
}

/* =========================================================
   Dropdown MultiSelect with Search + Select All
   ========================================================= */
function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function DropdownMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));

  const toggleValue = (val) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val));
    else onChange([...value, val]);
  };

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
<div className="relative overflow-visible" ref={boxRef}>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full border rounded-xl px-3 py-2 bg-white text-sm flex justify-between items-center"
        >
          <span className={selectedLabels.length ? "text-gray-700" : "text-gray-400"}>
            {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
          </span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
<div className="relative z-[20] bg-white border shadow rounded-xl mt-1 w-full max-h-60 overflow-y-auto text-gray-700">
          {options.length ? (
            options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleValue(opt.value)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                >
                  <div
                    className={`w-4 h-4 border rounded flex items-center justify-center ${
                      checked ? "bg-emerald-500 text-white" : "bg-white text-transparent"
                    }`}
                  >
                    <Check size={12} />
                  </div>
<span className="whitespace-normal break-words">{opt.label}</span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">لا توجد خيارات</div>
          )}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   FiltersBar — Dropdowns + Search + Select All
   ========================================================= */
function FiltersBar({
  filters,
  setFilters,
  branches,
  bankMethods,
  appMethods,
  onRefresh,
}) {
  const branchOptions = branches.map((b) => ({ value: b._id, label: b.name }));
  const bankOptions = bankMethods.map((n) => ({ value: n, label: n }));
  const appOptions = appMethods.map((n) => ({ value: n, label: n }));

  const clearAll = () =>
    setFilters({
      q: "",
      startDate: "",
      endDate: "",
      branch: [],
      bankMethod: [],
      appMethod: [],
    });

  return (
    <section
      className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4"
      data-html2canvas-ignore
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter size={16} />
          <b>فلاتر البحث</b>
          <span className="text-xs text-gray-400">
            (يمكن اختيار أكثر من فرع/طريقة)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="bg-gray-900 text-white px-3 py-2 rounded-xl hover:opacity-95 transition h-[40px]"
          >
            تحديث النتائج
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 h-[40px]"
            title="مسح كل الفلاتر"
          >
            مسح الكل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* بحث نصي */}
        <div className="md:col-span-3 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="بحث بالكلمات (ملاحظات / مستخدم / فرع)…"
            className="outline-none w-full text-sm"
          />
        </div>

        {/* التاريخ من/إلى */}
        <div className="md:col-span-2">
          <div className="text-xs text-gray-500 mb-1">من تاريخ</div>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((p) => ({ ...p, startDate: e.target.value }))
            }
            className="border rounded-xl px-3 py-2 bg-white text-sm w-full"
          />
        </div>
        <div className="md:col-span-2">
          <div className="text-xs text-gray-500 mb-1">إلى تاريخ</div>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((p) => ({ ...p, endDate: e.target.value }))
            }
            className="border rounded-xl px-3 py-2 bg-white text-sm w-full"
          />
        </div>

        {/* فروع متعددة */}
        <div className="md:col-span-2">
          <DropdownMultiSelect
            label="الفروع"
            placeholder="اختر فرع/فروع"
            options={branchOptions}
            value={filters.branch}
            onChange={(vals) => setFilters((p) => ({ ...p, branch: vals }))}
          />
        </div>

        {/* طرق بنك متعددة */}
        <div className="md:col-span-1">
          <DropdownMultiSelect
            label="طرق البنك"
            placeholder="اختر طريقة/طرق"
            options={bankOptions}
            value={filters.bankMethod}
            onChange={(vals) => setFilters((p) => ({ ...p, bankMethod: vals }))}
          />
        </div>

        {/* طرق التطبيقات متعددة */}
        <div className="md:col-span-2">
          <DropdownMultiSelect
            label="طرق التطبيقات"
            placeholder="اختر طريقة/طرق"
            options={appOptions}
            value={filters.appMethod}
            onChange={(vals) => setFilters((p) => ({ ...p, appMethod: vals }))}
          />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   OneTabView  (Pending / Released / Rejected)
   ========================================================= */
function OneTabView({ api, tabKey, title }) {
  const [forms, setForms] = useState([]);
  const [rejectedCache, setRejectedCache] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bankMethods, setBankMethods] = useState([]);
  const [appMethods, setAppMethods] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    startDate: "",
    endDate: "",
    branch: [],
    bankMethod: [],
    appMethod: [],
  });

  const [selectedForm, setSelectedForm] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState(""); // "release" | "reject"
  const [reviewNote, setReviewNote] = useState("");
  const boardRef = useRef(null);

  // Bootstrap: branches + templates (methods) + initial forms
  useEffect(() => {
    (async () => {
      try {
        const [bRes, fRes] = await Promise.all([
          api.get("/api/branches"),
          api.get("/api/forms/branch-manager"),
        ]);
        const _branches = bRes.data || [];
        setBranches(_branches);

        const allForms = fRes.data || [];

        // حاول تجيب الطرق من قوالب الأدمن أولاً
        let banksFromTemplates = [];
        let appsFromTemplates = [];
        try {
          const [bankTpl, appTpl] = await Promise.all([
            api.get("/api/report-templates?group=bank&isActive=1"),
            api.get("/api/report-templates?group=applications&isActive=1"),
          ]);
          banksFromTemplates = (bankTpl?.data || []).map((t) => t.name).filter(Boolean);
          appsFromTemplates = (appTpl?.data || []).map((t) => t.name).filter(Boolean);
        } catch (_e) {
          // تجاهل — هنستخدم fallback من الداتا
        }

        // fallback: استخرج الطرق من الفورمز
        const allBank = new Set(banksFromTemplates);
        const allApps = new Set(appsFromTemplates);
        allForms.forEach((f) => {
          f.bankCollections?.forEach((b) => allBank.add(b.name || "غير محدد"));
          f.applications?.forEach((a) => allApps.add(a.name || "غير محدد"));
        });

        setBankMethods([...allBank]);
        setAppMethods([...allApps]);
        setForms(allForms);
      } catch (err) {
        console.error("❌ خطأ أثناء التحميل:", err);
      }
    })();
  }, [api]);

  // Fetch forms (server) — basic params (التاريخ + q)
  const fetchForms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.q) params.q = filters.q;
      const res = await api.get("/api/forms/branch-manager", { params });
      setForms(res.data || []);
    } catch (e) {
      console.error(e);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.q]);

  // Compose filtered list per tab + local multi-filters
  const filteredForms = useMemo(() => {
    let result = [...forms];

    // Restrict by tab
    if (tabKey === "pending") {
      result = result.filter(
        (f) => !f.branchManagerRelease || f.branchManagerRelease.status === "pending"
      );
    } else if (tabKey === "released") {
      result = result.filter((f) => f.branchManagerRelease?.status === "released");
    } else if (tabKey === "rejected") {
      const currentRejected = result.filter(
        (f) => f.branchManagerRelease?.status === "rejected"
      );
      result = [
        ...currentRejected,
        ...rejectedCache.filter(
          (cached) => !currentRejected.some((f) => f._id === cached._id)
        ),
      ];
    }

    // Multi-select filters (branch/bank/app)
    if (Array.isArray(filters.branch) && filters.branch.length > 0) {
      const setB = new Set(filters.branch);
      result = result.filter((f) => f.branch?._id && setB.has(f.branch._id));
    }
    if (Array.isArray(filters.bankMethod) && filters.bankMethod.length > 0) {
      const setM = new Set(filters.bankMethod);
      result = result.filter((f) =>
        (f.bankCollections || []).some((b) => setM.has(b.name))
      );
    }
    if (Array.isArray(filters.appMethod) && filters.appMethod.length > 0) {
      const setA = new Set(filters.appMethod);
      result = result.filter((f) =>
        (f.applications || []).some((a) => setA.has(a.name))
      );
    }

    // Local search (user/branch/notes)
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (f) =>
          f.user?.name?.toLowerCase()?.includes(q) ||
          f.branch?.name?.toLowerCase()?.includes(q) ||
          f.notes?.toLowerCase()?.includes(q)
      );
    }

    // Sort newest
    result.sort((a, b) => {
      const aD = new Date(a.formDate).getTime();
      const bD = new Date(b.formDate).getTime();
      if (aD !== bD) return bD - aD;
      const aC = new Date(a.createdAt || 0).getTime();
      const bC = new Date(b.createdAt || 0).getTime();
      return bC - aC;
    });

    return result;
  }, [forms, tabKey, filters, rejectedCache]);

  // Totals
  const totals = useMemo(() => {
    return filteredForms.reduce(
      (acc, f) => {
        const cash = Number(f?.cashCollection || 0);
        const apps = appsWithFallback(f);
        const bank = bankWithFallback(f);
        acc.cash += cash;
        acc.apps += apps;
        acc.bank += bank;
        acc.total += cash + apps + bank;
        return acc;
      },
      { cash: 0, apps: 0, bank: 0, total: 0 }
    );
  }, [filteredForms]);

  const statsCards = useMemo(() => {
    return {
      total: filteredForms.length,
      pending: filteredForms.filter(
        (f) => !f.branchManagerRelease || f.branchManagerRelease.status === "pending"
      ).length,
      released: filteredForms.filter((f) => f.branchManagerRelease?.status === "released")
        .length,
      rejected: filteredForms.filter((f) => f.branchManagerRelease?.status === "rejected")
        .length,
    };
  }, [filteredForms]);

  // Attachments
  const fetchAttachments = async (formId) => {
    try {
      setAttLoading(true);
      const res = await api.get(`/api/documents/${formId}`);
      setAttachments(res.data || []);
    } catch (e) {
      console.error("❌ Error fetching attachments:", e);
      setAttachments([]);
    } finally {
      setAttLoading(false);
    }
  };

  // Actions
  const onAction = (form, action) => {
    setReviewTarget(form);
    setReviewAction(action); // "release" | "reject"
    setReviewNote("");
  };

  const confirmAction = async () => {
    if (!reviewTarget || !reviewAction) return;

    // Reject requires mandatory note
    if (reviewAction === "reject" && !reviewNote.trim()) {
      toast.error("سبب الرفض إجباري");
      return;
    }

    try {
      const url =
        reviewAction === "release"
          ? `/api/forms/${reviewTarget._id}/branch-release`
          : `/api/forms/${reviewTarget._id}/branch-reject`;

      await api.patch(url, { note: reviewNote.trim() });

      // Cache rejected locally
      if (reviewAction === "reject") {
        setRejectedCache((prev) => [
          ...prev.filter((r) => r._id !== reviewTarget._id),
          {
            ...reviewTarget,
            branchManagerRelease: {
              status: "rejected",
              note: reviewNote.trim(),
              at: new Date().toISOString(),
            },
          },
        ]);
      }

      if (reviewAction === "release") toast.success("تم الاعتماد بنجاح");
      else toast("تم الرفض وإرجاعه للمحاسب مع السبب", { icon: "⚠️" });

      await fetchForms();
      setReviewTarget(null);
      setReviewAction("");
      setReviewNote("");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "حدث خطأ أثناء تنفيذ العملية");
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      const el = boardRef.current;
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
      pdf.save(
        `branch-manager-${tabKey}-${filters.startDate || "from"}-${
          filters.endDate || "to"
        }.pdf`
      );
    } catch (err) {
      console.error(err);
      alert("تعذّر تصدير الـ PDF");
    }
  };

  return (
    <div className="space-y-6" ref={boardRef}>
      {/* Header & Tips */}
      <div className="flex items-center gap-2 text-gray-700">
        <Info size={16} className="opacity-60" />
        <span className="text-sm">
          {title} — الكروت والنتائج تتأثر بكل الفلاتر التالية.
        </span>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ColorCard
          title="عدد التقارير"
          value={statsCards.total}
          color="from-gray-500 to-gray-700"
          icon={<FileText />}
        />
        <ColorCard
          title="Pending"
          value={statsCards.pending}
          color="from-amber-400 to-yellow-500"
          icon={<Clock3 />}
        />
        <ColorCard
          title="Released"
          value={statsCards.released}
          color="from-emerald-500 to-green-600"
          icon={<CheckCircle2 />}
        />
        <ColorCard
          title="Rejected"
          value={statsCards.rejected}
          color="from-rose-500 to-red-600"
          icon={<XCircle />}
        />
        <button
          onClick={handleExportPDF}
          className="rounded-2xl p-4 shadow text-white bg-gray-900 hover:bg-black transition flex items-center justify-center gap-2"
          title="تصدير تقرير PDF"
        >
          <Download size={18} />
          <span className="font-semibold">تصدير PDF</span>
        </button>
      </section>

      {/* Totals */}
      <section className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4 overflow-visible">
        <h3 className="text-md font-semibold mb-3">إجماليات النتائج المعروضة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <MiniTotal title="نقدي" value={currency(totals.cash)} />
          <MiniTotal title="تطبيقات" value={currency(totals.apps)} />
          <MiniTotal title="البنك" value={currency(totals.bank)} />
          <MiniTotal title="إجمالي المبيعات" value={currency(totals.total)} />
        </div>
      </section>

      {/* Filters — واضحة دائمًا */}
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        branches={branches}
        bankMethods={bankMethods}
        appMethods={appMethods}
        onRefresh={fetchForms}
      />

      {/* Table */}
      <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            {title} ({filteredForms.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">التاريخ</th>
                <th className="p-2 border">الفرع</th>
                <th className="p-2 border">المستخدم</th>
                <th className="p-2 border">نقدي</th>
                <th className="p-2 border">تطبيقات</th>
                <th className="p-2 border">بنك</th>
                <th className="p-2 border">الإجمالي</th>
                <th className="p-2 border">الحالة</th>
                <th className="p-2 border">إجراءات</th>
                <th className="p-2 border">عرض</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center">
                    جاري التحميل…
                  </td>
                </tr>
              ) : filteredForms.length ? (
                filteredForms.map((f) => (
                  <tr key={f._id} className="text-center">
                    <td className="p-2 border">{formatDateOnly(f.formDate)}</td>
                    <td className="p-2 border">{f.branch?.name || "-"}</td>
                    <td className="p-2 border">{f.user?.name || "-"}</td>
                    <td className="p-2 border">{currency(f.cashCollection)}</td>
                    <td className="p-2 border">{currency(appsWithFallback(f))}</td>
                    <td className="p-2 border">{currency(bankWithFallback(f))}</td>
                    <td className="p-2 border">{currency(rowTotal(f))}</td>
                    <td className="p-2 border">
                      <StatusPill status={f.branchManagerRelease?.status} />
                    </td>
                    <td className="p-2 border">
                      {/* إجراءات المدير تظهر فقط في pending */}
                      {(!f.branchManagerRelease ||
                        f.branchManagerRelease.status === "pending") && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onAction(f, "release")}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded"
                          >
                            Release
                          </button>
                          <button
                            onClick={() => onAction(f, "reject")}
                            className="px-2 py-1 text-xs bg-rose-600 text-white rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-2 border">
<button
  onClick={() => {
    setSelectedForm(f);
    fetchAttachments(f._id);
  }}
  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow"
>
  عرض / PDF
</button>

                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-gray-500">
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Details Modal */}
      {selectedForm && (
        <DetailsModal
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          attachments={attachments}
          attLoading={attLoading}
          onAction={onAction}
        />
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
            <h3 className="text-lg font-bold mb-3 text-center">
              {reviewAction === "release"
                ? "إضافة ملاحظة (اختياري)"
                : "سبب الرفض (إجباري)"}
            </h3>
            <textarea
              className="w-full border rounded-xl p-3 text-sm min-h-[110px] focus:ring-2 focus:ring-emerald-400 outline-none"
              placeholder={
                reviewAction === "release"
                  ? "اكتب ملاحظتك للمحاسب (اختياري)"
                  : "اكتب سبب الرفض هنا..."
              }
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setReviewTarget(null);
                  setReviewNote("");
                  setReviewAction("");
                }}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 rounded-xl text-white ${
                  reviewAction === "release"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* =========================================================
   Main Page: BranchManagerDashboard
   ========================================================= */
export default function BranchManagerDashboard() {
  // ✅ استدعاء الـ Hook مرة واحدة فقط — إصلاح ESLint
  const api = useApi();

  const [tab, setTab] = useState("pending"); // pending | released | rejected | all
  const meName = localStorage.getItem("userName") || "مدير فرع";
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <Toaster position="top-center" toastOptions={{ duration: 2200 }} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 shadow-lg" />
            <div>
              <p className="text-xs text-gray-500">لوحة التحكم</p>
              <h1 className="text-lg font-bold tracking-tight">مدير فرع</h1>
            </div>
          </div>

          {/* Tabs Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <NavBtn
              icon={<Clock3 size={16} />}
              label="قيد المراجعة"
              active={tab === "pending"}
              onClick={() => setTab("pending")}
            />
            <NavBtn
              icon={<CheckCircle2 size={16} />}
              label="تم الاعتماد"
              active={tab === "released"}
              onClick={() => setTab("released")}
            />
            <NavBtn
              icon={<XCircle size={16} />}
              label="تم الرفض"
              active={tab === "rejected"}
              onClick={() => setTab("rejected")}
            />
            <NavBtn
              icon={<LayoutDashboard size={16} />}
              label="الكل (تحليل)"
              active={tab === "all"}
              onClick={() => setTab("all")}
            />
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">
              مرحباً، <b>{meName}</b>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition shadow"
            >
              <LogOut size={16} />
              <span>تسجيل خروج</span>
            </button>

            {/* Burger Menu (Mobile) */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg border bg-white"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t shadow flex flex-col">
            <button
              onClick={() => {
                setTab("pending");
                setMenuOpen(false);
              }}
              className="px-4 py-3 text-left hover:bg-gray-100"
            >
              قيد المراجعة
            </button>
            <button
              onClick={() => {
                setTab("released");
                setMenuOpen(false);
              }}
              className="px-4 py-3 text-left hover:bg-gray-100"
            >
              تم الاعتماد
            </button>
            <button
              onClick={() => {
                setTab("rejected");
                setMenuOpen(false);
              }}
              className="px-4 py-3 text-left hover:bg-gray-100"
            >
              تم الرفض
            </button>
            <button
              onClick={() => {
                setTab("all");
                setMenuOpen(false);
              }}
              className="px-4 py-3 text-left hover:bg-gray-100"
            >
              الكل (تحليل)
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === "pending" && (
          <OneTabView api={api} tabKey="pending" title="تقارير قيد المراجعة" />
        )}
        {tab === "released" && (
          <OneTabView api={api} tabKey="released" title="تقارير تم اعتمادها" />
        )}
        {tab === "rejected" && (
          <OneTabView api={api} tabKey="rejected" title="تقارير تم رفضها" />
        )}
        {tab === "all" && <AllAnalyticsTab api={api} />}
      </main>
    </div>
  );
}

/* =========================================================
   Analytics Tab (All)
   ========================================================= */
function AllAnalyticsTab({ api }) {
  const [forms, setForms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bankMethods, setBankMethods] = useState([]);
  const [appMethods, setAppMethods] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    startDate: "",
    endDate: "",
    branch: [],
    bankMethod: [],
    appMethod: [],
  });
  const [loading, setLoading] = useState(false);
  const boardRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [bRes, fRes] = await Promise.all([
          api.get("/api/branches"),
          api.get("/api/forms/branch-manager"),
        ]);
        const _branches = bRes.data || [];
        setBranches(_branches);
        const allForms = fRes.data || [];

        // حاول تجيب طرق البنك/التطبيقات من قوالب الأدمن أولاً
        let banksFromTemplates = [];
        let appsFromTemplates = [];
        try {
          const [bankTpl, appTpl] = await Promise.all([
            api.get("/api/report-templates?group=bank&isActive=1"),
            api.get("/api/report-templates?group=applications&isActive=1"),
          ]);
          banksFromTemplates = (bankTpl?.data || []).map((t) => t.name).filter(Boolean);
          appsFromTemplates = (appTpl?.data || []).map((t) => t.name).filter(Boolean);
        } catch (_e) {}

        const allBank = new Set(banksFromTemplates);
        const allApps = new Set(appsFromTemplates);
        allForms.forEach((f) => {
          f.bankCollections?.forEach((b) => allBank.add(b.name || "غير محدد"));
          f.applications?.forEach((a) => allApps.add(a.name || "غير محدد"));
        });
        setBankMethods([...allBank]);
        setAppMethods([...allApps]);

        setForms(allForms);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [api]);

  const refetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.q) params.q = filters.q;
      const res = await api.get("/api/forms/branch-manager", { params });
      setForms(res.data || []);
    } catch (e) {
      console.error(e);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredForms = useMemo(() => {
    let result = [...forms];

    if (Array.isArray(filters.branch) && filters.branch.length > 0) {
      const setB = new Set(filters.branch);
      result = result.filter((f) => f.branch?._id && setB.has(f.branch._id));
    }
    if (Array.isArray(filters.bankMethod) && filters.bankMethod.length > 0) {
      const setM = new Set(filters.bankMethod);
      result = result.filter((f) =>
        (f.bankCollections || []).some((b) => setM.has(b.name))
      );
    }
    if (Array.isArray(filters.appMethod) && filters.appMethod.length > 0) {
      const setA = new Set(filters.appMethod);
      result = result.filter((f) =>
        (f.applications || []).some((a) => setA.has(a.name))
      );
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (f) =>
          f.user?.name?.toLowerCase()?.includes(q) ||
          f.branch?.name?.toLowerCase()?.includes(q) ||
          f.notes?.toLowerCase()?.includes(q)
      );
    }
    if (filters.startDate)
      result = result.filter(
        (f) => new Date(f.formDate) >= new Date(filters.startDate)
      );
    if (filters.endDate)
      result = result.filter(
        (f) => new Date(f.formDate) <= new Date(filters.endDate)
      );

    return result;
  }, [forms, filters]);

  // Totals for cards
  const totals = useMemo(() => {
    return filteredForms.reduce(
      (acc, f) => {
        const cash = Number(f?.cashCollection || 0);
        const apps = appsWithFallback(f);
        const bank = bankWithFallback(f);
        acc.cash += cash;
        acc.apps += apps;
        acc.bank += bank;
        acc.total += cash + apps + bank;
        return acc;
      },
      { cash: 0, apps: 0, bank: 0, total: 0 }
    );
  }, [filteredForms]);

  const statusCounts = useMemo(() => {
    const c = { pending: 0, released: 0, rejected: 0 };
    for (const f of filteredForms) {
      const st = f?.branchManagerRelease?.status || "pending";
      if (st === "released") c.released++;
      else if (st === "rejected") c.rejected++;
      else c.pending++;
    }
    return c;
  }, [filteredForms]);

  const perBranchAgg = useMemo(() => {
    const map = new Map();
    for (const f of filteredForms) {
      const n = f.branch?.name || "غير محدد";
      map.set(n, (map.get(n) || 0) + rowTotal(f));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));
  }, [filteredForms]);

  const perDay = useMemo(() => {
    const map = new Map();
    for (const f of filteredForms) {
      const d = new Date(f.formDate);
      if (isNaN(d)) continue;
      const k = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        .toISOString()
        .slice(0, 10);
      map.set(k, (map.get(k) || 0) + rowTotal(f));
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [filteredForms]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  const statusPie = {
    labels: ["Pending", "Released", "Rejected"],
    datasets: [
      {
        data: [statusCounts.pending, statusCounts.released, statusCounts.rejected],
        backgroundColor: ["#fbbf24", "#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const perBranchBar = {
    labels: perBranchAgg.map((x) => x.name),
    datasets: [
      {
        label: "إجمالي المبيعات حسب الفرع",
        data: perBranchAgg.map((x) => x.total),
        backgroundColor: "#3b82f6",
        borderRadius: 8,
      },
    ],
  };

  const perDayLine = {
    labels: perDay.map((x) => x[0]),
    datasets: [
      {
        label: "الإجمالي اليومي",
        data: perDay.map((x) => x[1]),
        fill: true,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,.20)",
        tension: 0.35,
      },
    ],
  };

  const exportPDF = async () => {
    try {
      const el = boardRef.current;
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
      pdf.save(
        `branch-analytics-${filters.startDate || "from"}-${
          filters.endDate || "to"
        }.pdf`
      );
    } catch (err) {
      console.error(err);
      alert("تعذّر تصدير الـ PDF");
    }
  };

  return (
    <div className="space-y-6" ref={boardRef}>
      {/* Cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ColorCard
          title="عدد التقارير"
          value={filteredForms.length}
          color="from-gray-500 to-gray-700"
          icon={<FileText />}
        />
        <ColorCard
          title="Pending"
          value={statusCounts.pending}
          color="from-amber-400 to-yellow-500"
          icon={<Clock3 />}
        />
        <ColorCard
          title="Released"
          value={statusCounts.released}
          color="from-emerald-500 to-green-600"
          icon={<CheckCircle2 />}
        />
        <ColorCard
          title="Rejected"
          value={statusCounts.rejected}
          color="from-rose-500 to-red-600"
          icon={<XCircle />}
        />
        <button
          onClick={exportPDF}
          className="rounded-2xl p-4 shadow text-white bg-gray-900 hover:bg-black transition flex items-center justify-center gap-2"
          title="تصدير PDF"
        >
          <Download size={18} />
          <span className="font-semibold">تصدير PDF</span>
        </button>
      </section>

      {/* Totals */}
      <section className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-4">
        <h3 className="text-md font-semibold mb-3">إجماليات النتائج المعروضة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <MiniTotal title="نقدي" value={currency(totals.cash)} />
          <MiniTotal title="تطبيقات" value={currency(totals.apps)} />
          <MiniTotal title="البنك" value={currency(totals.bank)} />
          <MiniTotal title="إجمالي المبيعات" value={currency(totals.total)} />
        </div>
      </section>

      {/* Filters — واضحة دائمًا */}
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        branches={branches}
        bankMethods={bankMethods}
        appMethods={appMethods}
        onRefresh={refetch}
      />

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartBox title="حالة التقارير">
          <Pie data={statusPie} options={commonOptions} />
        </ChartBox>
        <ChartBox title="الإجمالي اليومي">
          <Line data={perDayLine} options={commonOptions} />
        </ChartBox>
        <ChartBox title="إجمالي المبيعات حسب الفرع">
          <Bar
            data={perBranchBar}
            options={{ ...commonOptions, scales: { y: { beginAtZero: true } } }}
          />
        </ChartBox>
      </section>
    </div>
  );
}

/* =========================================================
   Details Modal — زر إغلاق مثبت بأسفل المودال
   ========================================================= */
function DetailsModal({ form, onClose, attachments, attLoading, onAction }) {
  const modalRef = useRef(null);

  // PDF Export
  const exportPDF = async () => {
    try {
      const el = modalRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`report-${form._id}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("تعذّر تصدير الـ PDF");
    }
  };

  return (
<div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-[2147483647] overflow-y-auto">
<div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 relative z-[100000] flex flex-col">

        {/* Header */}
<div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-[10000] py-2">
          <h3 className="text-lg font-bold">تفاصيل التقرير</h3>

          <button
            onClick={exportPDF}
            className="px-3 py-1 text-xs bg-gray-900 text-white rounded-xl hover:bg-black flex items-center gap-1"
          >
            <Download size={14} />
            PDF
          </button>
        </div>

        {/* Content */}
        <div ref={modalRef}>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MiniTotal title="نقدي" value={currency(form.cashCollection)} />
            <MiniTotal title="تطبيقات" value={currency(appsWithFallback(form))} />
            <MiniTotal title="بنك" value={currency(bankWithFallback(form))} />
            <MiniTotal title="الإجمالي" value={currency(rowTotal(form))} />
          </div>

          {/* Basic Info */}
          <div className="space-y-1 text-sm bg-gray-50 p-3 rounded-xl mb-4">
            <p><b>التاريخ:</b> {formatDateOnly(form.formDate)}</p>
            <p><b>الفرع:</b> {form.branch?.name}</p>
            <p><b>المستخدم:</b> {form.user?.name}</p>
            <p><b>العهدة:</b> {currency(form.pettyCash)}</p>
            <p><b>المشتريات:</b> {currency(form.purchases)}</p>
            <p><b>ملاحظات المستخدم:</b> {form.notes || "-"}</p>
          </div>

          {/* Apps Breakdown */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">تفاصيل التطبيقات</h4>
            {form.applications?.length ? (
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">الطريقة</th>
                    <th className="p-2 border">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {form.applications.map((a, i) => (
                    <tr key={i}>
                      <td className="p-2 border">{a.name}</td>
                      <td className="p-2 border">{currency(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm">لا توجد معاملات تطبيقات</p>
            )}
          </div>

          {/* Bank Breakdown */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">تفاصيل البنك</h4>
            {form.bankCollections?.length ? (
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">الطريقة</th>
                    <th className="p-2 border">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {form.bankCollections.map((b, i) => (
                    <tr key={i}>
                      <td className="p-2 border">{b.name}</td>
                      <td className="p-2 border">{currency(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm">لا توجد معاملات بنكية</p>
            )}
          </div>

          {/* Attachments */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2">المرفقات</h4>
            {attLoading ? (
              <p className="text-gray-500 text-sm">جاري التحميل…</p>
            ) : attachments.length ? (
              <ul className="grid grid-cols-2 gap-2">
                {attachments.map((att) => {
                  const isImg = att.fileUrl?.match(/\.(jpg|jpeg|png|webp)$/i);
                  const href = att.fileUrl?.startsWith("http")
                    ? att.fileUrl
                    : `${process.env.REACT_APP_API_URL || ""}${att.fileUrl || ""}`;

                  return (
                    <li key={att._id} className="border rounded-xl overflow-hidden">
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {isImg ? (
                          <img src={href} className="w-full h-32 object-cover" alt="" />
                        ) : (
                          <div className="p-3 text-center text-sm">{att.fileUrl}</div>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">لا يوجد مرفقات</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          {(!form.branchManagerRelease ||
            form.branchManagerRelease.status === "pending") && (
            <>
              <button
                onClick={() => onAction(form, "release")}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
              >
                Release
              </button>
              <button
                onClick={() => onAction(form, "reject")}
                className="px-3 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

