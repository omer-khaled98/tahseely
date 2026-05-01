/* ---------------- AdminSummary ---------------- */
import React, { useState, useEffect, useMemo } from "react";
import { BarChart3, Building2, CalendarDays, Wallet, X } from "lucide-react";
import { BrandPageStyle } from "./brandTheme";

function AdminSummary({ api }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
    branchId: "",
    type: "",
    bankMethod: "",
    appMethod: "",
  });
  const [expandBank, setExpandBank] = useState({});
  const [expandApps, setExpandApps] = useState({});

  const currency = (n) => Number(n || 0).toLocaleString();

  useEffect(() => {
    api
      .get("/api/branches")
      .then((res) => setBranches(res.data || []))
      .catch((err) => console.error("Branches err:", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { adminStatus: "pending" };
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.branchId) params.branchId = filter.branchId;

    api
      .get("/api/forms/admin", { params })
      .then((res) => setRows(res.data || []))
      .catch((err) => console.error("Forms err:", err))
      .finally(() => setLoading(false));
  }, [filter.startDate, filter.endDate, filter.branchId]);

  const summary = useMemo(() => {
    let grandTotal = 0;
    let count = 0;
    const branchSummary = {};

    rows.forEach((f) => {
      const branch = f?.branch?.name || "غير معروف";

      if (!branchSummary[branch]) {
        branchSummary[branch] = {
          cash: 0,
          petty: 0,
          purch: 0,
          appsTotal: 0,
          bankTotal: 0,
          appsDetails: {},
          bankDetails: {},
        };
      }

      const B = branchSummary[branch];

      if (f.cashCollection > 0) {
        B.cash += f.cashCollection;
        grandTotal += f.cashCollection;
        count++;
      }
      if (f.pettyCash > 0) {
        B.petty += f.pettyCash;
        grandTotal += f.pettyCash;
        count++;
      }
      if (f.purchases > 0) {
        B.purch += f.purchases;
        grandTotal += f.purchases;
        count++;
      }

      (f.applications || []).forEach((a) => {
        B.appsTotal += a.amount;
        grandTotal += a.amount;
        if (!B.appsDetails[a.name]) B.appsDetails[a.name] = 0;
        B.appsDetails[a.name] += a.amount;
        count++;
      });

      (f.bankCollections || []).forEach((b) => {
        B.bankTotal += b.amount;
        grandTotal += b.amount;
        if (!B.bankDetails[b.name]) B.bankDetails[b.name] = 0;
        B.bankDetails[b.name] += b.amount;
        count++;
      });
    });

    return { branchSummary, grandTotal, count };
  }, [rows, filter]);

  if (!open) return null;

  return (
    <div className="brand-app fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <BrandPageStyle />
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto brand-card p-6 md:p-8 brand-scroll">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="brand-kicker text-sm flex items-center gap-2">
              <BarChart3 size={16} />
              ملخص التحصيل
            </div>
            <h2 className="brand-title text-3xl mt-2">لوحة موجزة للإجماليات</h2>
            <p className="text-slate-500 mt-2 text-sm md:text-base">
              نظرة أكثر تنظيمًا على التحصيل حسب الفروع مع تفصيل التطبيقات والبنك داخل مودال أنظف وأسهل قراءة.
            </p>
          </div>

          <button onClick={() => setOpen(false)} className="brand-muted-btn h-11 w-11 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard icon={<Wallet size={18} />} title="الإجمالي العام" value={currency(summary.grandTotal)} />
          <MetricCard icon={<BarChart3 size={18} />} title="عدد السجلات" value={summary.count} />
          <MetricCard icon={<Building2 size={18} />} title="عدد الفروع الظاهرة" value={Object.keys(summary.branchSummary).length} />
        </div>

        <div className="brand-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-[#0B4E8A]" />
            <h3 className="font-bold text-slate-800">الفلاتر</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter((p) => ({ ...p, startDate: e.target.value }))}
              className="border p-3 rounded-xl"
            />
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter((p) => ({ ...p, endDate: e.target.value }))}
              className="border p-3 rounded-xl"
            />
            <select
              value={filter.branchId}
              onChange={(e) => setFilter((p) => ({ ...p, branchId: e.target.value }))}
              className="border p-3 rounded-xl w-full"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="brand-soft p-5 text-slate-500 text-sm">جاري تحميل البيانات...</div>
          ) : Object.keys(summary.branchSummary).length ? (
            Object.keys(summary.branchSummary).map((branch) => {
              const B = summary.branchSummary[branch];
              const subtotal = B.cash + B.purch + B.appsTotal + B.bankTotal;

              return (
                <div key={branch} className="brand-card p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <div className="text-sm text-slate-500">الفرع</div>
                      <h4 className="text-xl font-extrabold text-slate-900 mt-1">{branch}</h4>
                    </div>
                    <div className="brand-badge">المجموع الفرعي: {currency(subtotal)}</div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <MiniMetric label="نقدي" value={currency(B.cash)} />
                    <MiniMetric label="عهدة" value={currency(B.petty)} />
                    <MiniMetric label="مشتريات" value={currency(B.purch)} />
                    <MiniMetric label="تطبيقات" value={currency(B.appsTotal)} />
                    <MiniMetric label="بنك" value={currency(B.bankTotal)} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ExpandBox
                      title="تفصيل التطبيقات"
                      total={currency(B.appsTotal)}
                      open={!!expandApps[branch]}
                      onToggle={() => setExpandApps((e) => ({ ...e, [branch]: !e[branch] }))}
                      items={B.appsDetails}
                      currency={currency}
                    />
                    <ExpandBox
                      title="تفصيل البنك"
                      total={currency(B.bankTotal)}
                      open={!!expandBank[branch]}
                      onToggle={() => setExpandBank((e) => ({ ...e, [branch]: !e[branch] }))}
                      items={B.bankDetails}
                      currency={currency}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="brand-soft p-5 text-slate-500 text-sm">لا توجد بيانات مطابقة للفلاتر الحالية.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value }) {
  return (
    <div className="brand-metric p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="text-[#0B4E8A]">{icon}</span>
        {title}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="brand-soft p-4 text-center">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 font-bold text-slate-800">{value}</div>
    </div>
  );
}

function ExpandBox({ title, total, open, onToggle, items, currency }) {
  const entries = Object.entries(items || {});

  return (
    <div className="brand-soft p-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between text-right">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="font-bold text-slate-800 mt-1">{total}</div>
        </div>
        <div className="brand-badge">{open ? "إخفاء" : "عرض"}</div>
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {entries.length ? (
            entries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 text-sm border-b border-slate-200/70 pb-2 last:border-b-0">
                <span className="text-slate-600">{key}</span>
                <span className="font-bold text-slate-800">{currency(value)}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">لا توجد بيانات.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminSummary;
