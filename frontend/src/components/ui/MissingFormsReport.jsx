import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Building2, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { useApi } from "../../hooks/useApi";

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

  /* ================= Load branches ================= */
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

  /* ================= Fetch Missing Days ================= */
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

  /* ================= Stats ================= */
  const stats = useMemo(() => {
    const total = days.length;
    const missing = days.filter((d) => d.missing).length;
    const completed = total - missing;
    const compliance =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, missing, completed, compliance };
  }, [days]);

  /* ================= UI ================= */
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700">
        <CalendarDays size={18} />
        <h3 className="font-bold text-lg">
          تقويم التقارير اليومية
        </h3>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600 mb-1 block">الفرع</label>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <Building2 size={16} className="text-gray-400" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full outline-none text-sm bg-transparent"
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

        <div>
          <label className="text-sm text-gray-600 mb-1 block">السنة</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">الشهر</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 w-full"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(2025, i, 1).toLocaleString("ar", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">من</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded-xl px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">إلى</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded-xl px-3 py-2 w-full"
          />
        </div>

        <div className="md:col-span-6 flex justify-end">
          <button
            onClick={fetchMissingDays}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60"
          >
            <Search size={16} />
            {loading ? "جارٍ التحميل..." : "عرض التقويم"}
          </button>
        </div>
      </div>

      {/* Legend */}
      {!!days.length && (
        <div className="flex gap-4 text-sm">
          <Legend color="bg-white border" label="تم إنشاء تقرير" />
          <Legend color="bg-rose-100 border-rose-400" label="لا يوجد تقرير" />
          <Legend color="bg-blue-100 border-blue-400" label="اليوم" />
        </div>
      )}

      {/* Stats */}
      {!!days.length && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <Stat label="إجمالي الأيام" value={stats.total} />
          <Stat label="مكتملة" value={stats.completed} />
          <Stat label="ناقصة" value={stats.missing} />
          <Stat label="نسبة الالتزام" value={`${stats.compliance}%`} />
        </div>
      )}

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {DAY_NAMES.map((d) => (
          <div key={d} className="font-bold text-gray-600">
            {d}
          </div>
        ))}

        {days.map((d) => (
          <div
            key={d.date}
            className={`relative rounded-xl border p-3 transition-all
              ${d.missing
                ? "bg-rose-100 border-rose-400 text-rose-700"
                : "bg-white border-gray-200 text-gray-700"}
              ${d.isToday ? "ring-2 ring-blue-400 bg-blue-50" : ""}
              hover:shadow-md`}
          >
            <div className="font-semibold">{d.date.split("-")[2]}</div>
            {d.missing && (
              <span className="absolute top-1 right-1 text-xs bg-rose-600 text-white px-1.5 rounded-full">
                ✕
              </span>
            )}
            {d.isToday && (
              <span className="absolute bottom-1 left-1 text-[10px] text-blue-600 font-bold">
                اليوم
              </span>
            )}
          </div>
        ))}

        {!days.length && !loading && (
          <div className="col-span-7 text-center text-gray-500 italic">
            اختر فرع ثم اضغط عرض
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Small Components ================= */

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded ${color}`}></span>
      <span>{label}</span>
    </div>
  );
}
