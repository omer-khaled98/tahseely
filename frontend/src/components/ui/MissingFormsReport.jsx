import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useApi } from "../../hooks/useApi";
import { Button } from "./button";

/* ================= Helpers ================= */

const DAY_NAMES = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const iso = (d) => d.toISOString().slice(0, 10);

const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { from: iso(start), to: iso(end) };
};

const getDaysBetween = (from, to) => {
  const days = [];
  const start = new Date(from);
  const end = new Date(to);
  const cur = new Date(start);

  while (cur <= end) {
    days.push({
      date: iso(cur),
      dayName: DAY_NAMES[cur.getDay()],
      dayIndex: cur.getDay(),
      isToday: iso(cur) === iso(new Date()),
    });
    cur.setDate(cur.getDate() + 1);
  }

  return days;
};

/* ================= Component ================= */

export default function MissingFormsReport() {
  const api = useApi();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/branches");
        setBranches(res.data || []);
      } catch {
        toast.error("تعذر تحميل الفروع");
      }
    })();
  }, [api]);

  const fetchMissingDays = async () => {
    if (!branchId) {
      toast.error("اختار الفرع");
      return;
    }

    setLoading(true);

    const range =
      from && to ? { from, to } : getMonthRange(year, month);

    try {
      const res = await api.get("/api/forms/admin/missing-forms", {
        params: { branchId, from: range.from, to: range.to },
      });

      const missingSet = new Set(res.data?.missingDays || []);

      const allDays = getDaysBetween(range.from, range.to).map((d) => ({
        ...d,
        missing: missingSet.has(d.date),
      }));

      setDays(allDays);
    } catch {
      toast.error("حصل خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = days.length;
    const missing = days.filter((d) => d.missing).length;
    const completed = total - missing;
    const compliance =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, missing, completed, compliance };
  }, [days]);

  return (
    <div className="rounded-[28px] border border-sky-100 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Header */}
      <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-900 via-sky-800 to-cyan-700 px-6 py-6 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_35%)]" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <CalendarDays size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold">تقويم التقارير اليومية</h3>
              <p className="text-sm text-sky-100 mt-1">
                متابعة الأيام التي لم يتم فيها إنشاء تقارير داخل الفرع المحدد
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur border border-white/10">
            {from && to
              ? `${from} → ${to}`
              : `${MONTH_NAMES[month]} ${year}`}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                الفرع
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <Building2 size={17} className="text-sky-700" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">-- اختر الفرع --</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Field label="السنة">
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </Field>

            <Field label="الشهر">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                {MONTH_NAMES.map((monthName, i) => (
                  <option key={i} value={i}>
                    {monthName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="من">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </Field>

            <Field label="إلى">
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </Field>

            <div className="md:col-span-6 flex justify-end">
              <Button
                onClick={fetchMissingDays}
                disabled={loading}
                className="min-w-[170px]"
              >
                <Search size={16} />
                {loading ? "جارٍ التحميل..." : "عرض التقويم"}
              </Button>
            </div>
          </div>
        </div>

        {!!days.length && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-5 text-sm">
              <Legend
                color="bg-white border border-slate-300"
                label="تم إنشاء تقرير"
              />
              <Legend
                color="bg-rose-100 border border-rose-300"
                label="لا يوجد تقرير"
              />
              <Legend
                color="bg-sky-100 border border-sky-300"
                label="اليوم"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="إجمالي الأيام"
                value={stats.total}
                icon={<CalendarDays size={18} />}
                tone="sky"
              />
              <StatCard
                label="مكتملة"
                value={stats.completed}
                icon={<CheckCircle2 size={18} />}
                tone="emerald"
              />
              <StatCard
                label="ناقصة"
                value={stats.missing}
                icon={<AlertTriangle size={18} />}
                tone="rose"
              />
              <StatCard
                label="نسبة الالتزام"
                value={`${stats.compliance}%`}
                icon={<BarChart3 size={18} />}
                tone="indigo"
              />
            </div>
          </>
        )}

        {/* Calendar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2 text-center text-sm">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="rounded-2xl bg-slate-50 py-3 font-bold text-slate-600"
              >
                {d}
              </div>
            ))}

            {days.map((d) => (
              <div
                key={d.date}
                className={[
                  "relative rounded-2xl border p-3 min-h-[78px] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md",
                  d.missing
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-700",
                  d.isToday
                    ? "ring-2 ring-sky-300 bg-sky-50 border-sky-300"
                    : "",
                ].join(" ")}
              >
                <div className="text-lg font-bold leading-none">
                  {d.date.split("-")[2]}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {d.dayName}
                </div>

                {d.missing && (
                  <span className="absolute top-2 right-2 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    ناقص
                  </span>
                )}

                {d.isToday && (
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-sky-700">
                    اليوم
                  </span>
                )}
              </div>
            ))}

            {!days.length && !loading && (
              <div className="col-span-7 py-12 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <CalendarDays size={22} />
                </div>
                <p className="font-medium text-slate-600">
                  اختر فرع ثم اضغط عرض
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  ستظهر لك الأيام المكتملة والناقصة خلال الفترة المحددة
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Small Components ================= */

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <div className="text-sm opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded ${color}`}></span>
      <span className="text-slate-600">{label}</span>
    </div>
  );
}