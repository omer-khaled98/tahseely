// src/pages/AdminDashboard.jsx — نسخة كاملة مع لوجز تشخيص + بدون تجميعات في تقارير الإدمن
import { useEffect, useMemo, useRef , useState } from "react";
import axios from "axios";
import MissingFormsReport from "../components/ui/MissingFormsReport";
import AdminBackupsPage from "./AdminBackupsPage";
import SalesReport from "./SalesReport";
import { useApi } from "../hooks/useApi";
import {
  LayoutDashboard, Receipt, Users as UsersIcon, Building2, Layers3, LogOut,
  Filter, Search, CheckCircle2, XCircle, Clock3, FileText, Pencil, Trash2, Plus, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminSummary from "../pages/AdminSummary";

// ===== Chart.js setup =====
import {
  Chart, ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip as ChartTooltip, Legend as ChartLegend, LineElement, PointElement, Filler,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

// ===== توستات جميلة =====
import { Toaster, toast } from "react-hot-toast";
import { BrandPageStyle } from "./brandTheme";

Chart.register(
  ArcElement, BarElement, CategoryScale, LinearScale,
  ChartTooltip, ChartLegend, LineElement, PointElement, Filler
);

// ===== Helpers عامة (apps/bank sums المُعلنة) =====
const sumApps = (f) => (f?.applications || []).reduce((s, a) => s + Number(a?.amount || 0), 0);
const sumBank = (f) => (f?.bankCollections || []).reduce((s, b) => s + Number(b?.amount || 0), 0);
const appsWithFallback = (f) => { const calc = sumApps(f); return calc > 0 ? calc : Number(f?.appsTotal || f?.appsCollection || 0); };
const bankWithFallback = (f) => { const calc = sumBank(f); return calc > 0 ? calc : Number(f?.bankTotal || 0); };
const rowTotal = (f) => Number(f?.cashCollection || 0) + appsWithFallback(f) + bankWithFallback(f);
const currency = (n) => Number(n || 0).toLocaleString();
const formatDateOnly = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString() : "-");

// ==== Received-only helpers (بدون أي fallback) ====
const getReceived = (f) => ({
  cash: Number(f?.received?.cash ?? f?.receivedCash ?? 0),
  apps: Number(f?.received?.apps ?? f?.receivedApps ?? 0),
  bank: Number(f?.received?.bank ?? f?.receivedBank ?? 0),
});
const recTotal = (f) => { const r = getReceived(f); return r.cash + r.apps + r.bank; };

// =================== MAIN ===================
export default function AdminDashboard() {
  // ميتاداتا سريعة (مافيهاش api)
  console.log("[ROLE]", localStorage.getItem("role"));
  console.log("[TOKEN?]", !!localStorage.getItem("token"));
  console.log("[API_URL]", process.env.REACT_APP_API_URL || "http://localhost:5000");

  // API
// API (via hook)
const api = useApi();


  // Interceptors + لوجز على كل ريكويست/ريسبونس
  useEffect(() => {
    const reqId = () => Math.random().toString(36).slice(2,7);

    const onReq = (config) => {
      const id = reqId();
      config.headers["X-Debug-ReqId"] = id;
      console.log("[API→] Req", id, config.method?.toUpperCase(), config.url, { params: config.params, data: config.data });
      return config;
    };
    const onReqErr = (error) => { console.log("[API→] ReqError", error?.message, error); return Promise.reject(error); };

    const onRes = (response) => {
      const id = response.config.headers["X-Debug-ReqId"];
      console.log("[API←] Res", id, response.config.url, { status: response.status, count: Array.isArray(response.data)? response.data.length : null, data: response.data });
      return response;
    };
    const onResErr = (error) => {
      const cfg = error?.config || {};
      console.log("[API←] ResError", cfg.url, error?.response?.status, error?.response?.data || error?.message);
      return Promise.reject(error);
    };

    const i1 = api.interceptors.request.use(onReq, onReqErr);
    const i2 = api.interceptors.response.use(onRes, onResErr);
    return () => { api.interceptors.request.eject(i1); api.interceptors.response.eject(i2); };
  }, [api]);

  // role helper
  const isAdmin = (localStorage.getItem("role") || "") === "Admin";

  // Tabs
  const [tab, setTab] = useState("dashboard"); // dashboard | receipts | users | branches | templates | adminReports

  // Navbar meta
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("role"); window.location.href = "/login"; };
  const meName = localStorage.getItem("userName") || "مشرف";

  return (
    <div className="brand-app">
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur brand-shell border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-logo-badge" />
            <div>
              <p className="text-xs text-gray-500">لوحة التحكم</p>
              <h1 className="text-lg font-bold tracking-tight">الإدارة</h1>
            </div>
          </div>

          {/* Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <NavBtn icon={<LayoutDashboard size={16} />} label="لوحة التحكم" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
            <NavBtn icon={<Receipt size={16} />} label="تقارير مدراء الفروع" active={tab==="receipts"} onClick={()=>setTab("receipts")} />
            <NavBtn icon={<UsersIcon size={16} />} label="المستخدمون" active={tab==="users"} onClick={()=>setTab("users")} />
            <NavBtn icon={<Building2 size={16} />} label="الفروع" active={tab==="branches"} onClick={()=>setTab("branches")} />
            <NavBtn icon={<Layers3 size={16} />} label="القوالب" active={tab==="templates"} onClick={()=>setTab("templates")} />
            <NavBtn
  icon={<FileText size={16} />}
  label="تقرير المبيعات"
  active={tab === "salesReport"}
  onClick={() => setTab("salesReport")}
/>

            {/*<NavBtn icon={<FileText size={16} />} label="تقارير الإدمن" active={tab==="adminReports"} onClick={()=>setTab("adminReports")} />*/}
            <NavBtn
  icon={<FileText size={16} />}
  label="الأيام الناقصة"
  active={tab === "missingForms"}
  onClick={() => setTab("missingForms")}
/>
            <NavBtn icon={<Layers3 size={16} />} label="كل الفواتير" active={tab==="allForms"} onClick={()=>setTab("allForms")} />
            <NavBtn icon={<Layers3 size={16} />} 
  label="ملخصات الإدارة" 
  active={tab==="adminSummary"} 
  onClick={()=>setTab("adminSummary")} />

          </nav>
          <NavBtn
  icon={<Download size={16} />}
  label="النسخ الاحتياطية"
  active={tab === "backups"}
  onClick={() => setTab("backups")}
/>


          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-600">مرحباً، <b>{meName}</b></span>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl brand-primary-btn hover:bg-black transition shadow">
              <LogOut size={16} /><span>تسجيل خروج</span>
            </button>
          </div>
        </div>

{/* Mobile Tabs */}
<div className="md:hidden px-2 pb-2 flex gap-2 overflow-auto">
  <SmallNavBtn label="لوحة التحكم" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
  <SmallNavBtn label="تقارير مدراء الفروع" active={tab==="receipts"} onClick={()=>setTab("receipts")} />
  <SmallNavBtn label="المستخدمون" active={tab==="users"} onClick={()=>setTab("users")} />
  <SmallNavBtn label="الفروع" active={tab==="branches"} onClick={()=>setTab("branches")} />
  <SmallNavBtn label="القوالب" active={tab==="templates"} onClick={()=>setTab("templates")} />
  <SmallNavBtn label="كل الفواتير" active={tab==="allForms"} onClick={()=>setTab("allForms")} />
  <SmallNavBtn label="ملخصات الإدارة" active={tab==="adminSummary"} onClick={()=>setTab("adminSummary")} />
    <SmallNavBtn
  label="تقرير المبيعات"
  active={tab === "salesReport"}
  onClick={() => setTab("salesReport")}
/>

    <SmallNavBtn
  label="الأيام الناقصة"
  active={tab === "missingForms"}
  onClick={() => setTab("missingForms")}
/>

<SmallNavBtn
  label="النسخ الاحتياطية"
  active={tab === "backups"}
  onClick={() => setTab("backups")}
/>
</div>



      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === "dashboard" && <DashboardHome api={api} />}
        {tab === "receipts" && <AdminReceipts api={api} isAdmin={isAdmin} />}
        {tab === "users" && <UsersPage api={api} isAdmin={isAdmin} />}
        {tab === "branches" && <BranchesPage api={api} isAdmin={isAdmin} />}
        {tab === "templates" && <TemplatesPage api={api} isAdmin={isAdmin} />}
        {tab === "adminReports" && <AdminReports api={api} isAdmin={isAdmin} />}
        {tab === "allForms" && <AllFormsPage api={api} isAdmin={isAdmin} />}
        {tab === "adminSummary" && <AdminSummary api={api} isAdmin={isAdmin} />}
        {tab === "backups" && <AdminBackupsPage api={api} isAdmin={isAdmin} />}
        {tab === "salesReport" && (
  <SalesReport api={api} isAdmin={isAdmin} />
)}

          {tab === "missingForms" && (
    <MissingFormsReport />
  )}
      </main>
    </div>
  );
}

/* ---------------- Tabs Buttons ---------------- */
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2 transition ${active ? "brand-primary-btn shadow" : "text-gray-700 hover:bg-slate-100/80"}`}>
      {icon}<span>{label}</span>
    </button>
  );
}
function SmallNavBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl text-xs transition whitespace-nowrap ${active ? "brand-primary-btn shadow" : "text-gray-700 bg-white/70 border hover:bg-white"}`}>
      {label}
    </button>
  );
}

/* ---------------- Dashboard (Charts only) ---------------- */
function DashboardHome({ api }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [apps, setApps] = useState([]);
  const [banks, setBanks] = useState([]);

  useEffect(() => { (async () => {
    try {
      console.log("[Dashboard] fetching branches/users/templates");
      const [bRes, uRes, aRes, kRes] = await Promise.all([
        api.get("/api/branches"),
        api.get("/api/users"),
        api.get("/api/report-templates?group=applications"),
        api.get("/api/report-templates?group=bank"),
      ]);
      setBranches(bRes.data || []);
      setUsers(uRes.data || []);
      setApps(aRes.data || []);
      setBanks(kRes.data || []);
      console.log("[Dashboard] counts =>", { branches: bRes.data?.length, users: uRes.data?.length, apps: aRes.data?.length, banks: kRes.data?.length });
    } catch (e) { console.error("[Dashboard] error", e); }
  })(); }, [api]);

  const roleCounts = ["Admin", "Accountant", "User"].map((r) => ({ role: r, count: users.filter((u) => u.role === r).length }));
  const pieData = { labels: roleCounts.map((x) => x.role), datasets: [{ data: roleCounts.map((x) => x.count), backgroundColor: ["#ef4444", "#10b981", "#3b82f6"], borderWidth: 0 }] };
  const barData = { labels: branches.map((b) => b.name), datasets: [{ label: "مستخدمون", data: branches.map((b) => users.filter((u) => (u.assignedBranches || []).some((x)=> (x?._id||x)===b._id)).length), backgroundColor: "#3b82f6", borderRadius: 8 }] };
  const areaData = { labels: ["تطبيقات","بنك"], datasets: [ { label: "فعّالة", data: [apps.filter(x=>x.isActive).length, banks.filter(x=>x.isActive).length], fill: true, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.25)" }, { label: "معطّلة", data: [apps.filter(x=>!x.isActive).length, banks.filter(x=>!x.isActive).length], fill: true, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,.18)" } ] };
  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } };

  return (
    <>
      {/* Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Layers3 className="opacity-80" />} title="طرق التطبيقات" value={apps.length} tint="from-sky-500 to-blue-900" />
        <StatCard icon={<Layers3 className="opacity-80" />} title="طرق البنك" value={banks.length} tint="from-sky-400 to-blue-700" />
        <StatCard icon={<Building2 className="opacity-80" />} title="عدد الفروع" value={branches.length} tint="from-sky-400 to-blue-800" />
        <StatCard icon={<UsersIcon className="opacity-80" />} title="عدد المستخدمين" value={users.length} tint="from-blue-500 to-slate-700" />
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 brand-card p-4">
          <h3 className="font-semibold mb-3">توزيع الأدوار</h3>
          <div className="h-64"><Pie data={pieData} options={commonOptions} /></div>
        </div>
        <div className="col-span-1 brand-card p-4">
          <h3 className="font-semibold mb-3">مستخدمون لكل فرع</h3>
          <div className="h-64"><Bar data={barData} options={{ ...commonOptions, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} /></div>
        </div>
        <div className="col-span-1 brand-card p-4">
          <h3 className="font-semibold mb-3">نشاط القوالب</h3>
          <div className="h-64"><Line data={areaData} options={{ ...commonOptions, elements: { line: { tension: 0.35 } } }} /></div>
        </div>
      </section>
    </>
  );
}

function StatCard({ icon, title, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
        <div className="h-10 w-10 flex items-center justify-center rounded-xl brand-primary-btn">{icon}</div>
      </div>
    </div>
  );
}

/* ---------------- Receipts Page (Admin actions) ---------------- */
function AdminReceipts({ api, isAdmin }) {
  const [forms, setForms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [filters, setFilters] = useState({
    branchId: "",
    startDate: "",
    endDate: "",
    q: "",
    adminStatus: "pending"
  });

  // modal
  const [activeForm, setActiveForm] = useState(null);
  const [note, setNote] = useState("");
  const [recvCash, setRecvCash] = useState("");
  const [recvApps, setRecvApps] = useState("");
  const [recvBank, setRecvBank] = useState("");
  const [actLoading, setActLoading] = useState(false);

  // =======================================================
  // 🟢 Attachments States
  // =======================================================
  const [attLoading, setAttLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // جلب المرفقات من API
  const loadAttachments = async (formId) => {
    try {
      setAttLoading(true);
      console.log("[ATT] Loading for form:", formId);

      const res = await api.get(`/api/documents/${formId}`);

      console.log("[ATT] Result:", res.data);
      setAttachments(res.data || []);
    } catch (err) {
      console.error("[ATT] Error loading:", err);
      setAttachments([]);
    } finally {
      setAttLoading(false);
    }
  };

  // =======================================================
  // Load Branches
  // =======================================================
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/branches");
        setBranches(res.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [api]);

  useEffect(() => {
    console.log("[Receipts] Filters changed:", filters);
  }, [filters]);

  // =======================================================
  // Load Forms
  // =======================================================
  const fetchForms = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const params = { accountantStatus: "released" };

      if (filters.adminStatus) params.adminStatus = filters.adminStatus;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.q) params.q = filters.q;

      console.log("[Receipts] Fetch params =>", params);

      const res = await api.get("/api/forms/admin", { params });

      console.log(
        "[Receipts] Result length:",
        Array.isArray(res.data) ? res.data.length : null
      );

      if (Array.isArray(res.data) && res.data.length) {
        console.log("[Receipts] First row sample:", res.data[0]);
      }

      setForms(res.data || []);
    } catch (e) {
      console.log(
        "[Receipts] Error:",
        e?.response?.status,
        e?.response?.data || e?.message
      );
      setErrorMsg(e?.response?.data?.message || "تعذّر تحميل التقارير");
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [
    api,
    filters.branchId,
    filters.startDate,
    filters.endDate,
    filters.q,
    filters.adminStatus
  ]);

  // =======================================================
  // Counters & Totals
  // =======================================================
  const counts = useMemo(() => {
    const c = { total: forms.length, pending: 0, released: 0, rejected: 0 };
    for (const f of forms) {
      if (f.adminStatus === "released") c.released++;
      else if (f.adminStatus === "rejected") c.rejected++;
      else c.pending++;
    }
    return c;
  }, [forms]);

  const totals = useMemo(
    () =>
      forms.reduce(
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
      ),
    [forms]
  );

  // =======================================================
  // Admin Release
  // =======================================================
  const doAdminRelease = async () => {
    if (!activeForm) return;
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");

    setActLoading(true);
    try {
      const fallbackCash = Number(activeForm?.cashCollection ?? 0);
      const fallbackApps = Number(appsWithFallback(activeForm) ?? 0);
      const fallbackBank = Number(bankWithFallback(activeForm) ?? 0);

      const payload = {
        note: note?.trim() || "",
        receivedCash:
          recvCash === "" ? fallbackCash : Number(recvCash || 0),
        receivedApps:
          recvApps === "" ? fallbackApps : Number(recvApps || 0),
        receivedBank:
          recvBank === "" ? fallbackBank : Number(recvBank || 0)
      };

      console.log(
        "[Receipts] AdminRelease payload =>",
        payload,
        "for form",
        activeForm?._id
      );

      await api.patch(
        `/api/forms/${activeForm._id}/admin-release`,
        payload
      );

      setActiveForm(null);
      setNote("");
      setRecvCash("");
      setRecvApps("");
      setRecvBank("");
      fetchForms();
      toast.success("تم الاستلام بنجاح ✨");
    } catch (e) {
      console.error(
        "[Receipts] AdminRelease error:",
        e?.response?.data || e?.message
      );
      toast.error(e?.response?.data?.message || "فشل الاستلام");
    } finally {
      setActLoading(false);
    }
  };

  // =======================================================
  // Admin Reject
  // =======================================================
  const doAdminReject = async () => {
    if (!activeForm) return;
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    if (!window.confirm("تأكيد رفض التقرير؟")) return;

    setActLoading(true);
    try {
      console.log("[Receipts] AdminReject", {
        id: activeForm?._id,
        note
      });

      await api.patch(
        `/api/forms/${activeForm._id}/admin-reject`,
        { note: note?.trim() || "" }
      );

      setActiveForm(null);
      setNote("");
      setRecvCash("");
      setRecvApps("");
      setRecvBank("");
      fetchForms();
      toast.success("تم الرفض");
    } catch (e) {
      console.error(
        "[Receipts] AdminReject error:",
        e?.response?.data || e?.message
      );
      toast.error(e?.response?.data?.message || "فشل الرفض");
    } finally {
      setActLoading(false);
    }
  };

  // =======================================================
  // UI
  // =======================================================

  return (
    <>
      {/* ================= Filters ================= */}
      <section className="brand-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-gray-600">
          <Filter size={16} />
          <b>فلاتر تحصيلات المحاسب</b>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <Search size={16} className="text-gray-400" />
            <input
              value={filters.q}
              onChange={(e) =>
                setFilters((p) => ({ ...p, q: e.target.value }))
              }
              className="outline-none w-full text-sm"
              placeholder="بحث (ملاحظات/مستخدم/فرع)…"
            />
          </div>

          <select
            value={filters.branchId}
            onChange={(e) =>
              setFilters((p) => ({ ...p, branchId: e.target.value }))
            }
            className="border rounded-xl px-3 py-2 bg-white text-sm"
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={filters.adminStatus}
            onChange={(e) =>
              setFilters((p) => ({ ...p, adminStatus: e.target.value }))
            }
            className="border rounded-xl px-3 py-2 bg-white text-sm"
          >
            <option value="pending">في انتظار الإدمن</option>
            <option value="released">تم استلامها</option>
            <option value="rejected">مرفوضة</option>
            <option value="">كل الحالات (إدمن)</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((p) => ({ ...p, startDate: e.target.value }))
            }
            className="border rounded-xl px-3 py-2 bg-white text-sm"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((p) => ({ ...p, endDate: e.target.value }))
            }
            className="border rounded-xl px-3 py-2 bg-white text-sm"
          />

          <div className="md:col-span-6 flex justify-end">
            <button
              onClick={fetchForms}
              className="brand-primary-btn px-4 py-2 rounded-xl hover:opacity-95"
            >
              تحديث
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 text-red-600">{errorMsg}</div>
        )}
      </section>

      {/* ================= Counters ================= */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<FileText />}
          label="إجمالي المعروض"
          value={counts.total}
          tint="from-sky-400 to-blue-800"
        />
        <KpiCard
          icon={<Clock3 />}
          label="Pending (إدمن)"
          value={counts.pending}
          tint="from-blue-500 to-indigo-700"
        />
        <KpiCard
          icon={<CheckCircle2 />}
          label="Released (إدمن)"
          value={counts.released}
          tint="from-sky-400 to-blue-700"
        />
        <KpiCard
          icon={<XCircle />}
          label="Rejected (إدمن)"
          value={counts.rejected}
          tint="from-sky-500 to-blue-900"
        />
      </section>

      {/* ================= Totals ================= */}
      <section className="brand-card p-4 mb-6">
        <h3 className="text-md font-semibold mb-3">
          إجماليات النتائج المعروضة
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <MiniTotal title="نقدي" value={currency(totals.cash)} />
          <MiniTotal title="تطبيقات" value={currency(totals.apps)} />
          <MiniTotal title="البنك" value={currency(totals.bank)} />
          <MiniTotal title="الإجمالي" value={currency(totals.total)} />
        </div>
      </section>

      {/* ================= Table ================= */}
      <section className="brand-card p-4">
        <div className="overflow-x-auto brand-table-wrap brand-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80">
              <tr>
                <th className="p-2 border">التاريخ</th>
                <th className="p-2 border">الفرع</th>
                <th className="p-2 border">المستخدم</th>
                <th className="p-2 border">نقدي</th>
                <th className="p-2 border">تطبيقات</th>
                <th className="p-2 border">بنك</th>
                <th className="p-2 border">إجمالي</th>
                <th className="p-2 border">حالة الإدمن</th>
                <th className="p-2 border">إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center">
                    جاري التحميل…
                  </td>
                </tr>
              ) : forms.length ? (
                forms.map((f) => (
                  <tr key={f._id} className="text-center">
                    <td className="p-2 border">
                      {formatDateOnly(f.formDate)}
                    </td>
                    <td className="p-2 border">
                      {f.branch?.name || "-"}
                    </td>
                    <td className="p-2 border">
                      {f.user?.name || "-"}
                    </td>
                    <td className="p-2 border">
                      {currency(f.cashCollection)}
                    </td>
                    <td className="p-2 border">
                      {currency(appsWithFallback(f))}
                    </td>
                    <td className="p-2 border">
                      {currency(bankWithFallback(f))}
                    </td>
                    <td className="p-2 border">
                      {currency(rowTotal(f))}
                    </td>
                    <td className="p-2 border">
                      {f.adminStatus === "released"
                        ? "Released"
                        : f.adminStatus === "rejected"
                        ? "Rejected"
                        : "Pending"}
                    </td>
                    <td className="p-2 border space-y-1">
                      <button
                        onClick={() => {
                          console.log(
                            "[Receipts] Open modal for form:",
                            f._id
                          );
                          setActiveForm(f);

                          // 🟢 تحميل المرفقات عند فتح المودال
                          loadAttachments(f._id);

                          setNote("");
                          setRecvCash(
                            String(Number(f?.cashCollection || 0))
                          );
                          setRecvApps(
                            String(
                              Number(appsWithFallback(f) || 0)
                            )
                          );
                          setRecvBank(
                            String(
                              Number(bankWithFallback(f) || 0)
                            )
                          );
                        }}
                        className="w-full px-2 py-1 brand-muted-btn"
                      >
                        تفاصيل/استلام
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-center text-gray-500"
                  >
                    لا توجد تقارير
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =======================================================
          ======================== MODAL ========================
          ======================================================= */}
{activeForm && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="brand-modal w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-3 z-10 border-b">
        <h3 className="text-lg font-bold">
          تفاصيل التقرير — {activeForm.branch?.name} — {formatDateOnly(activeForm.formDate)}
        </h3>
        <button
          onClick={() => setActiveForm(null)}
          className="border px-3 py-1 rounded-xl hover:bg-slate-50/80"
        >
          إغلاق
        </button>
      </div>

      {/* SUMMARY */}
      <h4 className="font-bold text-md mb-3">الملخص</h4>
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <MiniBox label="العهدة" value={currency(activeForm.pettyCash || 0)} />

        <MiniBox label="المشتريات" value={currency(activeForm.purchases || 0)} />

        <MiniBox label="النقدي" value={currency(activeForm.cashCollection || 0)} />

        <MiniBox label="التطبيقات (إجمالي)" value={currency(appsWithFallback(activeForm))} />

        <MiniBox label="البنك (إجمالي)" value={currency(bankWithFallback(activeForm))} />

        <MiniBox
          label="إجمالي بدون العهدة"
          value={currency(
            Number(activeForm.cashCollection || 0) +
            Number(appsWithFallback(activeForm) || 0) +
            Number(bankWithFallback(activeForm) || 0) +
            Number(activeForm.purchases || 0)
          )}
        />
      </div>

      {/* APPS DETAILS */}
      <h4 className="font-bold text-md mb-2">تفاصيل التطبيقات</h4>
      <table className="min-w-full text-sm border mb-4">
        <thead className="bg-slate-100/80">
          <tr>
            <th className="p-2 border">الاسم</th>
            <th className="p-2 border">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {(activeForm.applications || []).map((a, i) => (
            <tr key={i} className="text-center">
              <td className="p-2 border">{a.name}</td>
              <td className="p-2 border">{currency(a.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right mb-6 font-semibold">
        إجمالي التطبيقات: <span className="text-blue-600">{currency(appsWithFallback(activeForm))}</span>
      </div>

      {/* BANK DETAILS */}
      <h4 className="font-bold text-md mb-2">تفاصيل البنك</h4>
      <table className="min-w-full text-sm border mb-4">
        <thead className="bg-slate-100/80">
          <tr>
            <th className="p-2 border">النوع</th>
            <th className="p-2 border">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {(activeForm.bankCollections || []).map((b, i) => (
            <tr key={i} className="text-center">
              <td className="p-2 border">{b.name}</td>
              <td className="p-2 border">{currency(b.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right mb-6 font-semibold">
        إجمالي البنك: <span className="text-blue-600">{currency(bankWithFallback(activeForm))}</span>
      </div>

      {/* ATTACHMENTS */}
      <div className="mb-5 mt-6">
        <h4 className="font-semibold mb-2">المرفقات</h4>

        {attLoading ? (
          <p className="text-gray-500 text-sm">جاري التحميل…</p>
        ) : !attachments.length ? (
          <p className="text-gray-500 text-sm">لا يوجد مرفقات</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {attachments.map((att) => {
              const url = att.fileUrl?.startsWith("http")
                ? att.fileUrl
                : `${process.env.REACT_APP_API_URL || ""}${att.fileUrl}`;

              const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(att.fileUrl);

              return (
                <li key={att._id} className="border rounded-xl bg-slate-50/80 overflow-hidden">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {isImg ? (
                      <img src={url} alt="" className="w-full h-32 object-cover rounded" />
                    ) : (
                      <div className="p-3 text-center text-sm truncate">{att.fileUrl}</div>
                    )}
                  </a>

                  <button
                    onClick={() => window.open(url, "_blank")}
                    className="mt-2 mx-2 mb-2 w-[calc(100%-1rem)] rounded-xl brand-primary-btn px-2 py-1 text-sm"
                  >
                    فتح
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ===== NOTES SECTION ===== */}

      {/* USER NOTE */}
      <div className="mb-4 bg-slate-50/80 p-3 rounded-xl">
        <div className="flex justify-between mb-1">
          <p className="text-sm text-gray-600">ملاحظة المستخدم:</p>
          <p className="text-sm text-gray-500">{activeForm.user?.name || "—"}</p>
        </div>
        <p className="font-semibold">{activeForm.notes || "—"}</p>
      </div>

      {/* ACCOUNTANT NOTE */}
      <div className="mb-4 bg-slate-50/80 p-3 rounded-xl">
        <div className="flex justify-between mb-1">
          <p className="text-sm text-gray-600">ملاحظات المحاسب:</p>
          <p className="text-sm text-gray-500">
            {activeForm.accountantRelease?.by?.name || "—"}
          </p>
        </div>
        <p className="font-semibold">
          {activeForm.accountantRelease?.note || "—"}
        </p>
      </div>

      {/* BRANCH MANAGER NOTE */}
      <div className="mb-6 bg-slate-50/80 p-3 rounded-xl">
        <div className="flex justify-between mb-1">
          <p className="text-sm text-gray-600">ملاحظات مدير الفرع:</p>
          <p className="text-sm text-gray-500">
            {activeForm.branchManagerRelease?.by?.name || "—"}
          </p>
        </div>
        <p className="font-semibold">
          {activeForm.branchManagerRelease?.note || "—"}
        </p>
      </div>

      {/* ADMIN INPUT */}
      <h4 className="font-bold text-md mb-3">إدخال بيانات الإدمن</h4>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-sm text-gray-600">نقدي المستلم فعلاً</label>
          <input
            type="number"
            className="border rounded-xl p-2 w-full"
            value={recvCash}
            onChange={(e) => setRecvCash(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">تطبيقات المستلم فعلاً</label>
          <input
            type="number"
            className="border rounded-xl p-2 w-full"
            value={recvApps}
            onChange={(e) => setRecvApps(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">بنك المستلم فعلاً</label>
          <input
            type="number"
            className="border rounded-xl p-2 w-full"
            value={recvBank}
            onChange={(e) => setRecvBank(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm text-gray-600">ملاحظات الإدمن</label>
        <textarea
          className="border rounded-xl p-2 w-full min-h-24"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-2 sticky bottom-0 pt-3 bg-white z-10 border-t">
        <button
          disabled={actLoading}
          onClick={doAdminReject}
          className="px-3 py-2 brand-danger-btn rounded-xl hover:bg-blue-800"
        >
          رفض
        </button>

        <button
          disabled={actLoading}
          onClick={doAdminRelease}
          className="px-3 py-2 brand-success-btn rounded-xl hover:bg-blue-800"
        >
          استلام
        </button>
      </div>

    </div>
  </div>
)}


    </>
  );
}


function KpiCard({ icon, label, value, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className={`absolute -top-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${tint} opacity-20`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <h4 className="text-2xl font-extrabold tracking-tight">{value}</h4>
        </div>
        <div className="h-10 w-10 flex items-center justify-center rounded-xl brand-primary-btn">{icon}</div>
      </div>
    </div>
  );
}
function MiniTotal({ title, value }) { return (<div><div className="text-gray-500">{title}</div><div className="text-xl font-bold">{value}</div></div>); }
function MiniBox({ label, value }) { return (<div className="p-3 bg-slate-50/80 rounded-xl"><div className="text-gray-500">{label}</div><div className="font-bold">{value}</div></div>); }

/* ---------------- Users (Admin-only add/edit/delete) ---------------- */
function UsersPage({ api, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // تعديل
  const [editingUser, setEditingUser] = useState(null); // { _id, name, email, role, assignedBranches: [] }

  // إنشاء
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "User",
    assignedBranches: [],
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log("[Users] fetch users & branches");
        const [u, b] = await Promise.all([api.get("/api/users"), api.get("/api/branches")]);
        setUsers(u.data || []);
        setBranches(b.data || []);
        console.log("[Users] counts =>", { users: u.data?.length, branches: b.data?.length });
      } catch (e) {
        console.error("[Users] load error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const filtered = users.filter((u) => {
    const t = search.trim().toLowerCase();
    if (!t) return true;
    return (
      (u.name || "").toLowerCase().includes(t) ||
      (u.email || "").toLowerCase().includes(t) ||
      (u.role || "").toLowerCase().includes(t)
    );
  });

  // ====== حذف ======
  async function deleteUser(id) {
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    if (!window.confirm("تأكيد حذف المستخدم؟")) return;
    try {
      console.log("[Users] delete =>", id);
      await api.delete(`/api/users/${id}`);
      setUsers((arr) => arr.filter((u) => u._id !== id));
      toast.success("تم حذف المستخدم");
    } catch (e) {
      console.error("[Users] delete error", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "فشل الحذف");
    }
  }

  // ====== حفظ تعديل ======
  async function saveEditUser(e) {
    e.preventDefault();
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    try {
      console.log("[Users] save edit =>", editingUser?._id);
      await api.patch(`/api/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        assignedBranches: editingUser.assignedBranches,
      });
      setEditingUser(null);
      const res = await api.get("/api/users");
      setUsers(res.data || []);
      toast.success("تم تحديث البيانات");
    } catch (e) {
      console.error("[Users] save edit error", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "فشل التحديث");
    }
  }

  // ====== إنشاء مستخدم ======
  const toggleAssignCreate = (branchId) => {
    setNewUser((p) => {
      const has = p.assignedBranches.includes(branchId);
      return {
        ...p,
        assignedBranches: has ? p.assignedBranches.filter((x) => x !== branchId) : [...p.assignedBranches, branchId],
      };
    });
  };

  async function createUser(e) {
    e.preventDefault();
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    const { name, email, password } = newUser;
    if (!name.trim() || !email.trim() || !password) {
      return toast.error("من فضلك املأ الاسم والبريد وكلمة المرور");
    }
    try {
      setCreating(true);
      console.log("[Users] create =>", { name: newUser.name, email: newUser.email, role: newUser.role, assignedBranches: newUser.assignedBranches.length });
      const res = await api.post("/api/users", {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        assignedBranches: newUser.assignedBranches,
      });
      setUsers((arr) => [res.data, ...arr]);
      setNewUser({ name: "", email: "", password: "", role: "User", assignedBranches: [] });
      setCreateOpen(false);
      toast.success("تم إنشاء المستخدم بنجاح ✨");
    } catch (e) {
      console.error("[Users] create error", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "فشل إنشاء المستخدم");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="brand-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold">المستخدمون</h3>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-xl p-2 w-60"
            placeholder="بحث…"
          />
          {isAdmin && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl brand-primary-btn hover:bg:black"
            >
              <Plus size={16} /> إنشاء مستخدم
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto brand-table-wrap brand-scroll">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100/80">
            <tr>
              <th className="p-2 border">الاسم</th>
              <th className="p-2 border">البريد</th>
              <th className="p-2 border">الدور</th>
              <th className="p-2 border">الفروع</th>
              {isAdmin && <th className="p-2 border">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-4 text-center">
                  جاري التحميل…
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u._id} className="text-center">
                  <td className="p-2 border">{u.name}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.role}</td>
                  <td className="p-2 border">{u.assignedBranches?.map((b) => b?.name || b).join("، ") || "-"}</td>
                  {isAdmin && (
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() =>
                          setEditingUser({
                            _id: u._id,
                            name: u.name || "",
                            email: u.email || "",
                            role: u.role || "User",
                            assignedBranches: u.assignedBranches?.map((b) => (b?._id || b)) || [],
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-yellow-500 text-white hover:opacity-90"
                      >
                        <Pencil size={14} />
                        تعديل
                      </button>
                      <button
                        onClick={() => deleteUser(u._id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-700 text:white hover:opacity-90"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
            {!loading && !filtered.length && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-4 text-center text-gray-500">
                  لا توجد نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">تعديل مستخدم</h3>
            <form onSubmit={saveEditUser} className="space-y-3">
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="الاسم"
              />
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="البريد"
              />
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="border p-2 rounded-xl w-full"
              >
                <option value="User">User</option>
                <option value="Accountant">Accountant</option>
                <option value="Admin">Admin</option>
                <option value="BranchManager">BranchManager</option>
              </select>
              <div>
                <p className="mb-1 text-sm">الفروع المصرّح بها</p>
                <BranchCheckboxGrid
                  branches={branches}
                  selected={editingUser.assignedBranches}
                  onToggle={(id) => {
                    const exists = editingUser.assignedBranches.includes(id);
                    setEditingUser({
                      ...editingUser,
                      assignedBranches: exists
                        ? editingUser.assignedBranches.filter((x) => x !== id)
                        : [...editingUser.assignedBranches, id],
                    });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-3 py-1 border rounded-xl">
                  إلغاء
                </button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-xl">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create modal (Admin) */}
      {isAdmin && createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">إنشاء مستخدم جديد</h3>
            <form onSubmit={createUser} className="space-y-3">
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="الاسم"
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="user@example.com"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="border p-2 rounded-xl w-full"
                placeholder="كلمة المرور"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="border p-2 rounded-xl w-full"
              >
                <option value="User">User</option>
                <option value="Accountant">Accountant</option>
                <option value="Admin">Admin</option>
                <option value="BranchManager">Branch Manager</option>
              </select>

              <div>
                <p className="mb-1 text-sm">الفروع المصرّح بها</p>
                <BranchCheckboxGrid
                  branches={branches}
                  selected={newUser.assignedBranches}
                  onToggle={toggleAssignCreate}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1 border rounded-xl">
                  إلغاء
                </button>
                <button type="submit" disabled={creating} className="px-3 py-1 brand-primary-btn rounded-xl disabled:opacity-60">
                  {creating ? "جاري الإنشاء…" : "إنشاء"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchCheckboxGrid({ branches, selected, onToggle }){
  return (
    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-auto pr-1">
      {branches.map((b)=> (
        <label key={b._id} className="flex items-center gap-2 border p-2 rounded-xl bg-white">
          <input type="checkbox" checked={selected.includes(b._id)} onChange={()=> onToggle(b._id)} />
          {b.name}
        </label>
      ))}
    </div>
  );
}

/* ---------------- Branches (Admin-only add/edit/delete) ---------------- */
function BranchesPage({ api, isAdmin }) {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null); // { _id, name }
  const [editName, setEditName] = useState("");

  const load = async ()=> { 
    console.log("[Branches] load");
    const res = await api.get("/api/branches"); 
    setBranches(res.data||[]); 
  };
  useEffect(()=>{ load(); },[/*eslint-disable-line*/]);

  const add = async (e)=> {
    e.preventDefault(); if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!name.trim()) return;
    console.log("[Branches] add", name);
    await api.post("/api/branches", { name: name.trim() }); 
    setName(""); 
    await load(); 
    toast.success("تمت الإضافة");
  };
  const saveEdit = async (e)=> {
    e.preventDefault(); if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    console.log("[Branches] save edit", editing?._id, "->", editName);
    await api.patch(`/api/branches/${editing._id}`, { name: editName.trim() }); 
    setEditing(null); setEditName(""); 
    await load(); 
    toast.success("تم حفظ التعديلات");
  };
  const del = async (id)=> {
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!window.confirm("تأكيد حذف الفرع؟")) return;
    console.log("[Branches] delete", id);
    await api.delete(`/api/branches/${id}`); 
    await load(); 
    toast.success("تم الحذف");
  };

  return (
    <div className="brand-app space-y-6 p-4 md:p-6">
      <BrandPageStyle />
      {isAdmin && (
        <form onSubmit={add} className="brand-card p-4 flex gap-2">
          <input className="border rounded-xl p-2 flex-1" value={name} onChange={(e)=>setName(e.target.value)} placeholder="اسم الفرع" />
          <button className="bg-indigo-600 text-white px-4 rounded-xl">إضافة</button>
        </form>
      )}

      <div className="brand-card p-4">
        <h3 className="text-md font-semibold mb-2">الفروع</h3>
        <ul className="grid md:grid-cols-3 gap-2">
          {branches.map(b=> (
            <li key={b._id} className="border rounded-xl p-2 bg-white flex items-center justify-between">
              <span>{b.name}</span>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button onClick={()=> { setEditing(b); setEditName(b.name||""); }} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-yellow-500 text-white hover:opacity-90"><Pencil size={14}/>تعديل</button>
                  <button onClick={()=> del(b._id)} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl brand-danger-btn hover:opacity-90"><Trash2 size={14}/>حذف</button>
                </div>
              )}
            </li>
          ))}
          {!branches.length && <li className="text-gray-500">لا توجد فروع</li>}
        </ul>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">تعديل فرع</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <input type="text" value={editName} onChange={(e)=> setEditName(e.target.value)} className="border p-2 rounded-xl w-full" placeholder="اسم الفرع" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=> setEditing(null)} className="px-3 py-1 border rounded-xl">إلغاء</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-xl">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Templates (Admin-only add/toggle/edit/delete) ---------------- */
function TemplatesPage({ api, isAdmin }) {
  const [apps, setApps] = useState([]);
  const [banks, setBanks] = useState([]);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("applications");
  const [editing, setEditing] = useState(null); // {_id, name, group}
  const [editName, setEditName] = useState("");

  const load = async ()=>{
    console.log("[Templates] load");
    const [a, k] = await Promise.all([
      api.get("/api/report-templates?group=applications"),
      api.get("/api/report-templates?group=bank"),
    ]);
    setApps(a.data||[]); setBanks(k.data||[]);
  };
  useEffect(()=>{ load(); },[/*eslint-disable-line*/]);

  const add = async ()=>{
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!name.trim()) return;
    console.log("[Templates] add", { name, group });
    await api.post("/api/report-templates", { name: name.trim(), group });
    setName(""); await load(); toast.success("تمت الإضافة");
  };
  const toggle = async (id, cur)=>{
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    console.log("[Templates] toggle", id, "->", !cur);
    await api.patch(`/api/report-templates/${id}`, { isActive: !cur });
    await load(); toast.success(cur ? "تم التعطيل" : "تم التفعيل");
  };
  const saveEdit = async (e)=>{
    e.preventDefault(); if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    console.log("[Templates] save edit", editing?._id, "->", editName);
    await api.patch(`/api/report-templates/${editing._id}`, { name: editName.trim() });
    setEditing(null); setEditName(""); await load(); toast.success("تم الحفظ");
  };
  const del = async (id)=>{
    if(!isAdmin) return toast.error("صلاحية أدمن فقط");
    if(!window.confirm("تأكيد حذف الطريقة؟")) return;
    console.log("[Templates] delete", id);
    await api.delete(`/api/report-templates/${id}`);
    await load(); toast.success("تم الحذف");
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="brand-card p-4">
          <h3 className="text-md font-semibold mb-3">إضافة طريقة</h3>
          <div className="flex gap-2">
            <input className="border rounded-xl p-2 flex-1" value={name} onChange={(e)=>setName(e.target.value)} placeholder="اسم الطريقة" />
            <select className="border rounded-xl p-2" value={group} onChange={(e)=>setGroup(e.target.value)}>
              <option value="applications">تطبيقات</option>
              <option value="bank">بنك</option>
            </select>
            <button onClick={add} className="brand-primary-btn px-4 rounded-xl">إضافة</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <TemplateList title="طرق التطبيقات" items={apps} onToggle={toggle} onEdit={(a)=> { setEditing({ ...a, group: "applications" }); setEditName(a.name||""); }} onDelete={del} isAdmin={isAdmin} />
        <TemplateList title="طرق البنك" items={banks} onToggle={toggle} onEdit={(b)=> { setEditing({ ...b, group: "bank" }); setEditName(b.name||""); }} onDelete={del} isAdmin={isAdmin} />
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">تعديل طريقة ({editing.group === "applications" ? "تطبيقات" : "بنك"})</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <input type="text" value={editName} onChange={(e)=> setEditName(e.target.value)} className="border p-2 rounded-xl w-full" placeholder="اسم الطريقة" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=> setEditing(null)} className="px-3 py-1 border rounded-xl">إلغاء</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-xl">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateList({ title, items, onToggle, onEdit, onDelete, isAdmin }){
  return (
    <div className="brand-card p-4">
      <h3 className="text-md font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((it)=> (
          <li key={it._id} className="flex justify-between items-center border rounded-xl px-3 py-2">
            <span className={it.isActive ? "" : "line-through text-gray-400"}>{it.name}</span>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button onClick={()=> onToggle(it._id, it.isActive)} className="text-xs px-3 py-1 rounded-xl bg-slate-700 text-white hover:opacity-90">{it.isActive ? "تعطيل" : "تفعيل"}</button>
                  <button onClick={()=> onEdit(it)} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-yellow-500 text-white hover:opacity-90"><Pencil size={14}/>تعديل</button>
                  <button onClick={()=> onDelete(it._id)} className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-xl brand-danger-btn hover:opacity-90"><Trash2 size={14}/>حذف</button>
                </>
              )}
            </div>
          </li>
        ))}
        {!items.length && <li className="text-sm text-gray-500">لا توجد عناصر</li>}
      </ul>
    </div>
  );
}

/* ---------------- NEW: AdminReports (received-only + filters + CSV, بدون تجميعات) ---------------- */
function AdminReports({ api }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ branchId: "", userId: "", startDate: "", endDate: "", q: "", status: "released" });
  const [rows, setRows] = useState([]); // released فقط
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null); // لحفظ الفاتورة المحددة للتفاصيل

  // تحميل الفروع والمستخدمين
  useEffect(() => {
    (async () => {
      try {
        const [b, u] = await Promise.all([api.get('/api/branches'), api.get('/api/users')]);
        setBranches(b.data || []);
        setUsers(u.data || []);
      } catch (e) {
        console.error("[AdminReports] meta load error", e);
      }
    })();
  }, [api]);

  // تحميل البيانات بناءً على الفلاتر
  useEffect(() => {
    const fetchReleased = async () => {
      setLoading(true);
      try {
        const params = { adminStatus: filters.status };
        if (filters.branchId) params.branchId = filters.branchId;
        if (filters.userId) params.userId = filters.userId;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.q) params.q = filters.q;

        console.log("[AdminReports] Fetch params =>", params);

        const res = await api.get('/api/forms/admin', { params });
        setRows(res.data || []);
      } catch (e) {
        console.error("[AdminReports] Error:", e?.response?.data || e?.message);
        toast.error(e?.response?.data?.message || 'تعذّر تحميل البيانات');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReleased();
  }, [api, filters]);

  // إجماليات
  const sums = useMemo(() => rows.reduce((a, f) => {
    const cash = Number(f?.cashCollection || 0);
    const apps = appsWithFallback(f);
    const bank = bankWithFallback(f);
    a.cash += cash;
    a.apps += apps;
    a.bank += bank;
    a.total += (cash + apps + bank);
    return a;
  }, { cash: 0, apps: 0, bank: 0, total: 0 }), [rows]);

  // تصدير CSV
  const exportCSV = () => {
    const header = ['التاريخ', 'الفرع', 'المستخدم', 'نقدي (فعلي)', 'تطبيقات (فعلي)', 'بنك (فعلي)', 'الإجمالي (فعلي)'];
    const lines = [header.join(',')];
    for (const f of rows) {
      const r = getReceived(f);
      const total = r.cash + r.apps + r.bank;
      lines.push([
        formatDateOnly(f.formDate),
        (f.branch?.name || '-').replaceAll(',', ' '),
        (f.user?.name || '-').replaceAll(',', ' '),
        r.cash, r.apps, r.bank, total
      ].join(','));
    }
    const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin-reports.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير CSV');
  };

  return (
    <div className="space-y-6">
      <section className="brand-card p-4">
        <div className="flex items-center gap-2 mb-3 text-gray-600">
          <Filter size={16} />
          <b>فلاتر تقارير الإدمن (المستلم فقط)</b>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* فلاتر التقارير */}
          <div className="md:col-span-2 flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <Search size={16} className="text-gray-400" />
            <input value={filters.q} onChange={(e) => setFilters(p => ({ ...p, q: e.target.value }))} className="outline-none w-full text-sm" placeholder="بحث (ملاحظات/مرجع)…" />
          </div>
          <select value={filters.branchId} onChange={(e) => setFilters(p => ({ ...p, branchId: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="">كل الفروع</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <select value={filters.userId} onChange={(e) => setFilters(p => ({ ...p, userId: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="">كل المستخدمين</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <input type="date" value={filters.startDate} onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm" />
          <select value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))} className="border rounded-xl px-3 py-2 bg-white text-sm">
            <option value="released">مفعل</option>
            <option value="pending">معلق</option>
            <option value="rejected">مرفوض</option>
          </select>
          <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 mt-1">
            <div className="text-sm text-gray-500">النتائج: <b>{rows.length}</b></div>
            <div className="flex gap-2">
              <button onClick={() => {
                const d = new Date();
                const iso = (x) => x.toISOString().slice(0, 10);
                setFilters(p => ({ ...p, startDate: iso(d), endDate: iso(d) }));
              }} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50/80">اليوم</button>
              <button onClick={() => {
                const d = new Date();
                const day = d.getDay() || 7;
                const start = new Date(d);
                start.setDate(d.getDate() - (day - 1));
                const iso = (x) => x.toISOString().slice(0, 10);
                setFilters(p => ({ ...p, startDate: iso(start), endDate: iso(d) }));
              }} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50/80">هذا الأسبوع</button>
              <button onClick={() => {
                const d = new Date();
                const start = new Date(d.getFullYear(), d.getMonth(), 1);
                const iso = (x) => x.toISOString().slice(0, 10);
                setFilters(p => ({ ...p, startDate: iso(start), endDate: iso(d) }));
              }} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50/80">هذا الشهر</button>
              <button onClick={exportCSV} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50/80 inline-flex items-center gap-2">
                <Download size={16} /> تصدير CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* إجماليات (received-only) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="opacity-80" />} title="إجمالي النقدي" value={currency(sums.cash)} tint="from-blue-500 to-indigo-700" />
        <StatCard icon={<Layers3 className="opacity-80" />} title="إجمالي التطبيقات" value={currency(sums.apps)} tint="from-sky-400 to-blue-700" />
        <StatCard icon={<Layers3 className="opacity-80" />} title="إجمالي البنك" value={currency(sums.bank)} tint="from-sky-400 to-blue-800" />
        <StatCard icon={<CheckCircle2 className="opacity-80" />} title="الإجمالي الكلي" value={currency(sums.total)} tint="from-sky-500 to-blue-900" />
      </section>

      {/* جدول السجلات (received-only) */}
      <section className="brand-card p-4">
        <h3 className="text-md font-semibold mb-3">السجلات المستلمة</h3>
        <div className="overflow-x-auto brand-table-wrap brand-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80">
              <tr>
                <th className="p-2 border">التاريخ</th>
                <th className="p-2 border">الفرع</th>
                <th className="p-2 border">المستخدم</th>
                <th className="p-2 border">نقدي (فعلي)</th>
                <th className="p-2 border">تطبيقات (فعلي)</th>
                <th className="p-2 border">بنك (فعلي)</th>
                <th className="p-2 border">الإجمالي</th>
                <th className="p-2 border">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-4 text-center">جاري التحميل…</td></tr>
              ) : rows.length ? (
                rows.map((f) => {
                  const r = getReceived(f);
                  const total = r.cash + r.apps + r.bank;
                  return (
                    <tr key={f._id} className="text-center">
                      <td className="p-2 border">{formatDateOnly(f.formDate)}</td>
                      <td className="p-2 border">{f.branch?.name || '-'}</td>
                      <td className="p-2 border">{f.user?.name || '-'}</td>
                      <td className="p-2 border">{currency(r.cash)}</td>
                      <td className="p-2 border">{currency(r.apps)}</td>
                      <td className="p-2 border">{currency(r.bank)}</td>
                      <td className="p-2 border">{currency(total)}</td>
                      <td className="p-2 border">
                        <button onClick={() => setSelectedInvoice(f)} className="text-blue-500 hover:underline">عرض التفاصيل</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* عرض تفاصيل الفاتورة */}
      {selectedInvoice && (
        <section className="brand-card p-4 mt-6">
          <h3 className="text-md font-semibold mb-3">تفاصيل الفاتورة</h3>
          <div className="mb-4">
            <p><strong>التاريخ:</strong> {formatDateOnly(selectedInvoice.formDate)}</p>
            <p><strong>الفرع:</strong> {selectedInvoice.branch?.name || '-'}</p>
            <p><strong>المستخدم:</strong> {selectedInvoice.user?.name || '-'}</p>
            <p><strong>الملاحظات:</strong> {selectedInvoice.notes}</p>
            <p><strong>التطبيقات:</strong></p>
            <ul>
              {selectedInvoice.applications.map((app, index) => (
                <li key={index}>{app.name}: {app.amount}</li>
              ))}
            </ul>
            <p><strong>المرفقات:</strong> {/* يمكنك إضافة الكود هنا لعرض المرفقات */}</p>
          </div>
          <button onClick={() => setSelectedInvoice(null)} className="text-blue-500 hover:underline">إغلاق</button>
        </section>
      )}
    </div>
  );
}

/* ---------------- مُحسن: AllFormsPage (لوحة تحكم الأدمن) ---------------- */

function AllFormsPage({ api, isAdmin }) {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters (كما يتوقعها الباك اند)
  const [filters, setFilters] = useState({
    q: "",
    branchId: "",
    userId: "",
    status: "", // pending | waitingBranch | released | rejected | ""
  });

  // بحث متأخر (debounce)
  const [qInput, setQInput] = useState("");
  const qTimer = useRef(null);

  // فرز
  const [sortDir, setSortDir] = useState("desc"); // desc أحدث أولًا

  // modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeFormId, setActiveFormId] = useState(null);
  const [activeForm, setActiveForm] = useState(null);
  const [activeDocs, setActiveDocs] = useState([]);

  // تبويبات داخل المودال
  const [modalTab, setModalTab] = useState("summary"); // summary | details | attachments | timeline

  useEffect(() => {
    (async () => {
      try {
        const [b, u] = await Promise.all([api.get("/api/branches"), api.get("/api/users")]);
        setBranches(b.data || []);
        setUsers(u.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [api]);

  // debounce q
  useEffect(() => {
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      setFilters((p) => ({ ...p, q: qInput }));
    }, 350);

    return () => {
      if (qTimer.current) clearTimeout(qTimer.current);
    };
  }, [qInput]);

  const cleanParams = (obj) => {
    const p = { ...obj };
    Object.keys(p).forEach((k) => {
      const v = p[k];
      if (v === "" || v === null || v === undefined) delete p[k];
    });
    return p;
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = cleanParams(filters);
      const res = await api.get("/api/forms/all", { params });
      setRows(res.data || []);
      // console.log("[AllForms] count =", res.data?.length, "| filters =", params);
    } catch (e) {
      console.error("[AllForms] error", e?.response?.data || e?.message);
      toast.error("حصل خطأ أثناء تحميل الفواتير ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.branchId, filters.userId, filters.status, filters.q]);

  // ---------- أدوات عرض ----------
  const fmtSAR = (n) => {
    const x = Number(n || 0);
    try {
      return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 2,
      }).format(x);
    } catch {
      return `${x} ر.س`;
    }
  };

  const formatDateOnly = (d) => (d ? new Date(d).toLocaleDateString("ar-SA") : "—");
  const formatDateTime = (d) => (d ? new Date(d).toLocaleString("ar-SA") : "—");

  // آخر إجراء (لإظهار “آخر تحديث”)
  const lastActionAt = (f) => {
    const candidates = [
      f?.adminRelease?.at,
      f?.branchManagerRelease?.at,
      f?.accountantRelease?.at,
      f?.uploadedAt,
      f?.updatedAt,
      f?.createdAt,
    ]
      .map((x) => (x ? new Date(x).getTime() : 0))
      .filter((t) => t > 0);
    if (!candidates.length) return null;
    return new Date(Math.max(...candidates)).toISOString();
  };

  // حالة الفاتورة (للعرض)
  const statusKey = (f) => {
    if (f?.status === "rejected") return "rejected";
    if (f?.adminRelease?.status === "released") return "released";
    if (f?.accountantRelease?.status !== "released") return "pending"; // في انتظار المحاسب
    if (f?.branchManagerRelease?.status !== "released") return "waitingBranch"; // في انتظار مدير الفرع
    if (f?.adminRelease?.status !== "released") return "waitingAdmin"; // في انتظار الأدمن
    return "pending";
  };

  const statusBadge = (f) => {
    const k = statusKey(f);
    const base = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border";

    if (k === "pending")
      return (
        <span className={`${base} bg-sky-50 text-blue-800 border-amber-200`}>
          <i className="fas fa-user-tie" /> قيد مراجعة المحاسب
        </span>
      );

    if (k === "waitingBranch")
      return (
        <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
          <i className="fas fa-user-shield" /> قيد مراجعة مدير الفرع
        </span>
      );

    if (k === "waitingAdmin")
      return (
        <span className={`${base} bg-violet-50 text-violet-700 border-violet-200`}>
          <i className="fas fa-user-cog" /> قيد مراجعة الأدمن
        </span>
      );

    if (k === "released")
      return (
        <span className={`${base} bg-green-50 text-green-700 border-green-200`}>
          <i className="fas fa-check-circle" /> معتمدة نهائيًا
        </span>
      );

    return (
      <span className={`${base} bg-sky-50 text-blue-800 border-rose-200`}>
        <i className="fas fa-times-circle" /> مرفوضة
      </span>
    );
  };

  // ---------- ترتيب ----------
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const ta = new Date(a?.formDate || a?.createdAt || 0).getTime();
      const tb = new Date(b?.formDate || b?.createdAt || 0).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
    return copy;
  }, [rows, sortDir]);

  // ---------- إحصائيات ----------
  const totals = useMemo(() => {
    const t = {
      all: rows.length,
      pending: 0,
      waitingBranch: 0,
      waitingAdmin: 0,
      released: 0,
      rejected: 0,
    };
    rows.forEach((r) => {
      const k = statusKey(r);
      t[k] = (t[k] || 0) + 1;
    });
    return t;
  }, [rows]);

  // ---------- معاينة ----------
  const openPreview = async (id) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setActiveFormId(id);
    setActiveForm(null);
    setActiveDocs([]);
    setModalTab("summary");

    try {
      const [formRes, docsRes] = await Promise.all([
        api.get(`/api/forms/${id}`),
        api.get(`/api/documents/${id}`),
      ]);

      setActiveForm(formRes.data || null);
      setActiveDocs(docsRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("فشل تحميل تفاصيل الفاتورة ❌");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setActiveFormId(null);
    setActiveForm(null);
    setActiveDocs([]);
  };

  const copySerial = async () => {
    const s = activeForm?.serialNumber;
    if (!s) return toast.error("لا يوجد سيريال لنسخه");
    try {
      await navigator.clipboard.writeText(String(s));
      toast.success("تم نسخ السيريال ✅");
    } catch {
      toast.error("تعذر نسخ السيريال ❌");
    }
  };

  // ---------- حذف مع تأكيد Toast ----------
  const confirmDeleteToast = (id) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto border border-rose-100`}
          dir="rtl"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-rose-100 flex items-center justify-center">
                <i className="fas fa-trash text-blue-700"></i>
              </div>

              <div className="flex-1">
                <p className="font-extrabold text-gray-900">تأكيد الحذف</p>
                <p className="text-sm text-gray-600 mt-1">
                  هل أنت متأكد من حذف الفاتورة نهائيًا؟ لا يمكن التراجع عن هذه العملية.
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      toast.dismiss(t.id);
                      await deleteForm(id);
                    }}
                    className="px-4 py-2 rounded-xl brand-danger-btn hover:bg-blue-800 text-sm font-semibold"
                  >
                    نعم، احذف
                  </button>

                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-4 py-2 rounded-xl bg-slate-100/80 text-gray-700 hover:bg-gray-200 text-sm font-semibold"
                  >
                    إلغاء
                  </button>
                </div>
              </div>

              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="إغلاق"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 7000 }
    );
  };

  const deleteForm = async (id) => {
    try {
      await api.delete(`/api/forms/${id}/delete`);
      toast.success("تم الحذف بنجاح ✅");
      setRows((p) => p.filter((x) => x._id !== id));
      if (activeFormId === id) closePreview();
    } catch (e) {
      toast.error("فشل الحذف ❌");
      console.error(e);
    }
  };

  // ---------- شرائح سريعة للحالات ----------
  const quickStatuses = [
    { key: "", label: "الكل", count: totals.all, icon: "fas fa-layer-group" },
    { key: "pending", label: "قيد مراجعة المحاسب", count: totals.pending, icon: "fas fa-user-tie" },
    { key: "waitingBranch", label: "قيد مراجعة مدير الفرع", count: totals.waitingBranch, icon: "fas fa-user-shield" },
    { key: "released", label: "معتمدة", count: totals.released, icon: "fas fa-check-circle" },
    { key: "rejected", label: "مرفوضة", count: totals.rejected, icon: "fas fa-times-circle" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <section className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg">
              <i className="fas fa-file-invoice-dollar ml-2 text-gray-700"></i>
              لوحة التحكم — كل الفواتير
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              فلترة + معاينة كاملة داخل مودال + مرفقات + تسلسل زمني
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="الكل" value={totals.all} icon="fas fa-layer-group" />
            <StatPill label="محاسب" value={totals.pending} icon="fas fa-user-tie" />
            <StatPill label="مدير فرع" value={totals.waitingBranch} icon="fas fa-user-shield" />
            <StatPill label="أدمن" value={totals.waitingAdmin} icon="fas fa-user-cog" />
            <StatPill label="معتمدة" value={totals.released} icon="fas fa-check-circle" />
            <StatPill label="مرفوضة" value={totals.rejected} icon="fas fa-times-circle" />
          </div>
        </div>

        {/* Quick status chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quickStatuses.map((s) => {
            const active = filters.status === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setFilters((p) => ({ ...p, status: s.key }))}
                className={`px-3 py-2 rounded-2xl border text-sm font-bold flex items-center gap-2 transition
                  ${active ? "brand-primary-btn border-gray-900" : "bg-white text-gray-700 hover:bg-slate-50/80"}`}
              >
                <i className={`${s.icon}`} />
                <span>{s.label}</span>
                <span className={`${active ? "bg-white/20" : "bg-slate-100/80"} px-2 py-0.5 rounded-full text-xs`}>
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="text-xs font-semibold text-gray-700">بحث</label>
            <div className="relative">
              <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="ابحث بالملاحظات…"
                className="w-full pr-10 pl-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-700">الفرع</label>
            <select
              value={filters.branchId}
              onChange={(e) => setFilters((p) => ({ ...p, branchId: e.target.value }))}
              className="w-full px-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-gray-700">المستخدم</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
              className="w-full px-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="">كل المستخدمين</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-700">الحالة</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="w-full px-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="">كل الحالات</option>
              <option value="pending">قيد مراجعة المحاسب</option>
              <option value="waitingBranch">قيد مراجعة مدير الفرع</option>
              <option value="released">معتمدة</option>
              <option value="rejected">مرفوضة</option>
            </select>
          </div>

          <div className="md:col-span-12 flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => setSortDir((p) => (p === "desc" ? "asc" : "desc"))}
              className="px-4 py-2 rounded-2xl bg-white border hover:bg-slate-50/80 text-gray-700 font-extrabold text-sm"
              title="تغيير ترتيب التاريخ"
            >
              <i className="fas fa-sort ml-2"></i>
              ترتيب التاريخ: {sortDir === "desc" ? "الأحدث" : "الأقدم"}
            </button>

            <button
              onClick={() => {
                setQInput("");
                setSortDir("desc");
                setFilters({ q: "", branchId: "", userId: "", status: "" });
              }}
              className="px-4 py-2 rounded-2xl bg-slate-100/80 hover:bg-gray-200 text-gray-700 font-extrabold text-sm"
            >
              <i className="fas fa-eraser ml-2"></i>
              مسح الفلاتر
            </button>

            <button
              onClick={fetchAll}
              className="px-4 py-2 rounded-2xl bg-gray-900 hover:bg-black text-white font-extrabold text-sm"
            >
              <i className="fas fa-sync-alt ml-2"></i>
              تحديث
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="brand-card overflow-hidden">
        <div className="overflow-x-auto brand-table-wrap brand-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/80 sticky top-0 z-10">
              <tr>
                <th className="p-3 border text-right">السيريال</th>
                <th className="p-3 border text-right">التاريخ</th>
                <th className="p-3 border text-right">الفرع</th>
                <th className="p-3 border text-right">المستخدم</th>
                <th className="p-3 border text-right">الإجمالي</th>
                <th className="p-3 border text-right">آخر إجراء</th>
                <th className="p-3 border text-right">الحالة</th>

                {isAdmin && (
                  <>
                    <th className="p-3 border text-right">معاينة</th>
                    <th className="p-3 border text-right">حذف</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="text-center p-6 text-gray-600">
                    <i className="fas fa-spinner fa-spin ml-2 text-gray-500"></i> جاري التحميل...
                  </td>
                </tr>
              ) : sortedRows.length ? (
                sortedRows.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50/80">
                    <td className="p-3 border font-extrabold text-gray-900">
                      {f.serialNumber || "—"}
                    </td>
                    <td className="p-3 border">{formatDateOnly(f.formDate)}</td>
                    <td className="p-3 border">{f.branch?.name || "—"}</td>
                    <td className="p-3 border">{f.user?.name || "—"}</td>
                    <td className="p-3 border font-bold">{fmtSAR(f.totalSales || 0)}</td>
                    <td className="p-3 border">{formatDateTime(lastActionAt(f))}</td>
                    <td className="p-3 border">{statusBadge(f)}</td>

                    {isAdmin && (
                      <>
                        <td className="p-3 border">
                          <button
                            onClick={() => openPreview(f._id)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-2xl hover:bg-blue-700 w-full sm:w-auto font-extrabold"
                          >
                            <i className="fas fa-eye ml-2"></i>معاينة
                          </button>
                        </td>

                        <td className="p-3 border">
                          <button
                            onClick={() => confirmDeleteToast(f._id)}
                            className="brand-danger-btn px-3 py-2 rounded-2xl hover:bg-blue-800 w-full sm:w-auto font-extrabold"
                          >
                            <i className="fas fa-trash-alt ml-2"></i>حذف
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="text-center p-8 text-gray-500 italic">
                    <i className="fas fa-inbox ml-2"></i>لا توجد فواتير حاليًا
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Preview Modal */}
      <Modal open={previewOpen} onClose={closePreview}>
        <div className="p-5" dir="rtl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">
                <i className="fas fa-receipt ml-2 text-gray-700"></i>
                معاينة فاتورة {activeForm?.serialNumber ? `— ${activeForm.serialNumber}` : ""}
              </h3>
              <p className="text-sm text-gray-600 mt-1">كل التفاصيل + المرفقات + التسلسل الزمني</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copySerial}
                className="px-3 py-2 rounded-2xl brand-muted-btn font-extrabold text-sm"
                title="نسخ السيريال"
              >
                <i className="fas fa-copy ml-2"></i>نسخ السيريال
              </button>

              <button
                onClick={closePreview}
                className="w-10 h-10 rounded-2xl bg-slate-100/80 hover:bg-gray-200 flex items-center justify-center"
                aria-label="إغلاق"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {previewLoading ? (
            <div className="py-10 text-center text-gray-600">
              <i className="fas fa-spinner fa-spin ml-2"></i> جاري تحميل التفاصيل...
            </div>
          ) : !activeForm ? (
            <div className="py-10 text-center text-gray-600">لا توجد بيانات</div>
          ) : (
            <div className="mt-4 space-y-5">
              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                <TabButton active={modalTab === "summary"} onClick={() => setModalTab("summary")}>
                  <i className="fas fa-star ml-2" /> ملخص
                </TabButton>
                <TabButton active={modalTab === "details"} onClick={() => setModalTab("details")}>
                  <i className="fas fa-list ml-2" /> تفاصيل
                </TabButton>
                <TabButton active={modalTab === "attachments"} onClick={() => setModalTab("attachments")}>
                  <i className="fas fa-paperclip ml-2" /> مرفقات
                </TabButton>
                <TabButton active={modalTab === "timeline"} onClick={() => setModalTab("timeline")}>
                  <i className="fas fa-stream ml-2" /> تسلسل زمني
                </TabButton>
              </div>

              {/* Summary */}
              {modalTab === "summary" && (
                <>
                  <div className="rounded-2xl border bg-gradient-to-br from-white to-gray-50 p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-600">السيريال</div>
                        <div className="text-xl font-extrabold text-gray-900">
                          {activeForm.serialNumber || "—"}
                        </div>
                        <div className="mt-2">{statusBadge(activeForm)}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <InfoRow label="التاريخ" value={formatDateOnly(activeForm.formDate)} />
                        <InfoRow label="وقت الرفع" value={formatDateTime(activeForm.uploadedAt || activeForm.createdAt)} />
                        <InfoRow label="الفرع" value={activeForm.branch?.name || "—"} />
                        <InfoRow label="المنشئ" value={activeForm.user?.name || "—"} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <MoneyCard title="نقدي" value={fmtSAR(activeForm.cashCollection)} icon="fas fa-money-bill-wave" />
                    <MoneyCard title="تطبيقات" value={fmtSAR(activeForm.appsTotal)} icon="fas fa-mobile-alt" />
                    <MoneyCard title="بنك" value={fmtSAR(activeForm.bankTotal)} icon="fas fa-university" />
                    <MoneyCard title="الإجمالي" value={fmtSAR(activeForm.totalSales)} icon="fas fa-coins" />
                    <MoneyCard title="مشتريات" value={fmtSAR(activeForm.purchases)} icon="fas fa-shopping-cart" />
                    <MoneyCard title="عهدة" value={fmtSAR(activeForm.pettyCash)} icon="fas fa-hand-holding-usd" />
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h4 className="font-extrabold text-gray-900 mb-2">
                      <i className="fas fa-sticky-note ml-2 text-gray-700"></i>
                      ملاحظات
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {activeForm.notes?.trim() ? activeForm.notes : "—"}
                    </p>
                  </div>
                </>
              )}

              {/* Details */}
              {modalTab === "details" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-white p-4">
                    <h4 className="font-extrabold text-gray-900 mb-3">
                      <i className="fas fa-list ml-2 text-gray-700"></i>
                      تفاصيل التطبيقات
                    </h4>

                    <MiniTable
                      rows={(activeForm.applications || []).map((a, i) => ({
                        key: i,
                        name: a?.name || "—",
                        amount: fmtSAR(a?.amount),
                      }))}
                      emptyText="لا توجد تطبيقات"
                    />
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <h4 className="font-extrabold text-gray-900 mb-3">
                      <i className="fas fa-list ml-2 text-gray-700"></i>
                      تفاصيل البنك
                    </h4>

                    <MiniTable
                      rows={(activeForm.bankCollections || []).map((b, i) => ({
                        key: i,
                        name: b?.name || "—",
                        amount: fmtSAR(b?.amount),
                      }))}
                      emptyText="لا توجد بيانات بنك"
                    />
                  </div>
                </div>
              )}

              {/* Attachments */}
              {modalTab === "attachments" && (
                <div className="rounded-2xl border bg-white p-4">
                  <h4 className="font-extrabold text-gray-900 mb-3">
                    <i className="fas fa-paperclip ml-2 text-gray-700"></i>
                    المرفقات
                  </h4>
                  <AttachmentsGrid docs={activeDocs} />
                </div>
              )}

              {/* Timeline */}
              {modalTab === "timeline" && (
                <div className="rounded-2xl border bg-white p-4">
                  <h4 className="font-extrabold text-gray-900 mb-3">
                    <i className="fas fa-stream ml-2 text-gray-700"></i>
                    التسلسل الزمني
                  </h4>
                  <Timeline form={activeForm} formatDateTime={formatDateTime} />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- UI Helpers ---------------- */

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-2xl border font-extrabold text-sm transition
        ${active ? "brand-primary-btn border-gray-900" : "bg-white text-gray-700 hover:bg-slate-50/80"}`}
    >
      {children}
    </button>
  );
}

function StatPill({ label, value, icon }) {
  return (
    <div className="px-3 py-2 rounded-2xl bg-white border shadow-sm flex items-center gap-2">
      <i className={`${icon} text-gray-600`}></i>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-sm font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="px-3 py-2 rounded-2xl bg-white border">
      <div className="text-xs text-gray-500 font-semibold">{label}</div>
      <div className="text-sm font-extrabold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

function MoneyCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 font-semibold">{title}</div>
          <div className="text-lg font-extrabold text-gray-900 mt-1">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center">
          <i className={`${icon} text-gray-700`}></i>
        </div>
      </div>
    </div>
  );
}

function MiniTable({ rows, emptyText }) {
  if (!rows?.length) {
    return (
      <div className="text-sm text-gray-500 italic flex items-center gap-2">
        <i className="fas fa-inbox"></i> {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            <th className="p-2 border text-right">الاسم</th>
            <th className="p-2 border text-right">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-slate-50/80">
              <td className="p-2 border">{r.name}</td>
              <td className="p-2 border font-extrabold">{r.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentsGrid({ docs, attLoading }) {
  if (attLoading) {
    return (
      <div className="text-sm text-gray-500 italic flex items-center gap-2">
        <i className="fas fa-paperclip"></i> جاري التحميل…
      </div>
    );
  }

  if (!docs?.length) {
    return (
      <div className="text-sm text-gray-500 italic flex items-center gap-2">
        <i className="fas fa-paperclip"></i> لا توجد مرفقات
      </div>
    );
  }

  const groupName = (type) => {
    const map = {
      cash: "نقدي",
      bank: "بنك",
      apps: "تطبيقات",
      purchase: "مشتريات",
      petty: "عهدة",
    };
    return map[type] || "أخرى";
  };

  const isImage = (url) => /\.(png|jpe?g|webp|gif)$/i.test(url || "");
  const isPdf = (url) => /\.pdf$/i.test(url || "");

  const groups = docs.reduce((acc, d) => {
    const k = d?.type || "other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {});

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">المرفقات</h4>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.keys(groups).map((k) => (
          <div key={k}>
            <div className="text-sm font-extrabold text-gray-900 mb-2">
              <i className="fas fa-folder-open ml-2 text-gray-700"></i>
              {groupName(k)}
            </div>

            {groups[k].map((d, idx) => {
              const url = d?.fileUrl || "";
              const href = url?.startsWith("http")
                ? url
                : `${process.env.REACT_APP_API_URL || ""}${url || ""}`;

              return (
                <li key={`${k}-${idx}`} className="border rounded-xl overflow-hidden">
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {isImage(url) ? (
                      <img src={href} className="w-full h-32 object-cover" alt="مرفق" />
                    ) : isPdf(url) ? (
                      <div className="text-center text-gray-700">
                        <i className="fas fa-file-pdf text-3xl"></i>
                        <div className="text-xs mt-2 font-extrabold">ملف PDF</div>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm">{url}</div>
                    )}
                  </a>
                </li>
              );
            })}
          </div>
        ))}
      </ul>
    </div>
  );
}

function Timeline({ form, formatDateTime }) {
  const safeName = (by) => {
    if (!by) return "—";
    if (typeof by === "string") return by;
    return by?.name || "—";
  };

  const steps = [
    {
      title: "تم إنشاء / رفع الفاتورة",
      icon: "fas fa-upload",
      status: "تم",
      by: form?.user?.name,
      at: form?.uploadedAt || form?.createdAt,
      note: "",
    },
    {
      title: "قرار المحاسب",
      icon: "fas fa-user-tie",
      status: mapArabicStatus(form?.accountantRelease?.status),
      by: safeName(form?.accountantRelease?.by),
      at: form?.accountantRelease?.at || form?.accountantReleaseAt,
      note: form?.accountantRelease?.note || "",
    },
    {
      title: "قرار مدير الفرع",
      icon: "fas fa-user-shield",
      status: mapArabicStatus(form?.branchManagerRelease?.status),
      by: safeName(form?.branchManagerRelease?.by),
      at: form?.branchManagerRelease?.at || form?.branchManagerReleaseAt,
      note: form?.branchManagerRelease?.note || "",
    },
    {
      title: "قرار الأدمن",
      icon: "fas fa-user-cog",
      status: mapArabicStatus(form?.adminRelease?.status),
      by: safeName(form?.adminRelease?.by),
      at: form?.adminRelease?.at || form?.adminReleaseAt,
      note: form?.adminRelease?.note || form?.adminNote || "",
    },
  ];

  function pill(ar) {
    const base = "px-2 py-1 rounded-full text-xs font-extrabold border inline-flex items-center gap-2";
    if (ar === "معتمد")
      return (
        <span className={`${base} bg-green-50 text-green-700 border-green-200`}>
          <i className="fas fa-check-circle"></i> معتمد
        </span>
      );
    if (ar === "مرفوض")
      return (
        <span className={`${base} bg-sky-50 text-blue-800 border-rose-200`}>
          <i className="fas fa-times-circle"></i> مرفوض
        </span>
      );
    if (ar === "تم")
      return (
        <span className={`${base} bg-slate-50/80 text-gray-700 border-gray-200`}>
          <i className="fas fa-check"></i> تم
        </span>
      );
    return (
      <span className={`${base} bg-sky-50 text-blue-800 border-amber-200`}>
        <i className="fas fa-hourglass-half"></i> قيد المراجعة
      </span>
    );
  }

  return (
    <div className="brand-app space-y-3 p-4 md:p-6">
      <BrandPageStyle />
      {steps.map((s, idx) => (
        <div key={idx} className="rounded-2xl border bg-slate-50/80 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border flex items-center justify-center">
                <i className={`${s.icon} text-gray-700`}></i>
              </div>
              <div>
                <div className="font-extrabold text-gray-900">{s.title}</div>
                <div className="text-sm text-gray-600 mt-0.5">
                  بواسطة: <span className="font-extrabold">{s.by || "—"}</span>{" "}
                  {s.at ? (
                    <>
                      — <span className="font-semibold">{formatDateTime(s.at)}</span>
                    </>
                  ) : (
                    <>— <span className="font-semibold">لم يتم بعد</span></>
                  )}
                </div>
              </div>
            </div>

            <div>{pill(s.status)}</div>
          </div>

          {s.note?.trim() ? (
            <div className="mt-3 text-sm text-gray-700 bg-white border rounded-2xl p-3">
              <div className="text-xs text-gray-500 font-semibold mb-1">ملاحظة</div>
              <div className="whitespace-pre-wrap">{s.note}</div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function mapArabicStatus(s) {
  if (s === "released") return "معتمد";
  if (s === "rejected") return "مرفوض";
  if (!s || s === "pending") return "قيد المراجعة";
  return "قيد المراجعة";
}

function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 p-3 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border">
          {children}
        </div>
      </div>
    </div>
  );
}

export { AllFormsPage };