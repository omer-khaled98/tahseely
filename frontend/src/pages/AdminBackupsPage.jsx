// src/pages/AdminBackupsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Download, Building2, CalendarDays, CheckSquare, Square } from "lucide-react";

const iso = (d) => d.toISOString().slice(0, 10);

function safeFileName(name) {
  return String(name || "backup")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function AdminBackupsPage({ api, isAdmin }) {
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(iso(today));

  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [selectAll, setSelectAll] = useState(true);
  const [branchIds, setBranchIds] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Load branches
  useEffect(() => {
    (async () => {
      try {
        setLoadingBranches(true);
        const res = await api.get("/api/branches");
        setBranches(res.data || []);
      } catch (e) {
        console.error(e);
        toast.error("تعذر تحميل الفروع");
      } finally {
        setLoadingBranches(false);
      }
    })();
  }, [api]);

  const toggleBranch = (id) => {
    setSelectAll(false);
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const setRangeToday = () => {
    const d = new Date();
    setFrom(iso(d));
    setTo(iso(d));
  };

  const setRangeThisWeek = () => {
    const d = new Date();
    const day = d.getDay() || 7; // sunday=0 -> 7
    const start = new Date(d);
    start.setDate(d.getDate() - (day - 1));
    setFrom(iso(start));
    setTo(iso(d));
  };

  const setRangeThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    setFrom(iso(start));
    setTo(iso(d));
  };

  const validate = () => {
    if (!from || !to) {
      toast.error("حدد من / إلى");
      return false;
    }
    if (new Date(from) > new Date(to)) {
      toast.error("تاريخ (من) لازم يكون قبل (إلى)");
      return false;
    }
    if (!selectAll && branchIds.length === 0) {
      toast.error("اختار فرع واحد على الأقل أو فعّل (الكل)");
      return false;
    }
    return true;
  };

  const handleDownload = async () => {
    if (!isAdmin) return toast.error("صلاحية أدمن فقط");
    if (!validate()) return;

    setDownloading(true);
    const toastId = toast.loading("جاري تجهيز ملف الـ Backup…");

    try {
      const params = {
        from,
        to,
        includeAttachments: includeAttachments ? "true" : "false",
        branches: selectAll ? "all" : branchIds.join(","),
      };

      const res = await api.get("/api/admin/backups/export", {
        params,
        responseType: "blob",
      });

      const fn = safeFileName(
        `backup_${from}_to_${to}_${selectAll ? "ALL" : `branches_${branchIds.length}`}${
          includeAttachments ? "_with_files" : "_data_only"
        }.zip`
      );

      downloadBlob(res.data, fn);
      toast.success("تم تنزيل النسخة الاحتياطية ✅", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "فشل تنزيل النسخة الاحتياطية", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-6">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <Download size={18} />
          <h3 className="font-bold text-lg">إدارة النسخ الاحتياطية</h3>
        </div>

        <p className="text-sm text-gray-600">
          اختر الفترة والفروع ثم نزّل ملف ZIP يحتوي التقارير (والمرفقات اختياريًا) داخل تقسيم: فرع ⇢ شهر ⇢ يوم.
        </p>
      </div>

      {/* Filters */}
      <section className="bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <CalendarDays size={18} />
          <h4 className="font-semibold">فلاتر النسخ الاحتياطية</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 mb-1 block">من</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 mb-1 block">إلى</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full bg-white"
            />
          </div>

          <div className="md:col-span-4 flex flex-wrap gap-2 items-end justify-end">
            <button
              onClick={setRangeToday}
              className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              اليوم
            </button>
            <button
              onClick={setRangeThisWeek}
              className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              هذا الأسبوع
            </button>
            <button
              onClick={setRangeThisMonth}
              className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              هذا الشهر
            </button>
          </div>
        </div>

        {/* Branches */}
        <div className="border rounded-2xl p-4 bg-white">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Building2 size={18} />
              <h4 className="font-semibold">الفروع</h4>
            </div>

            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => {
                  const v = e.target.checked;
                  setSelectAll(v);
                  if (v) setBranchIds([]);
                }}
              />
              تحميل الكل
            </label>
          </div>

          {loadingBranches ? (
            <div className="text-gray-500 text-sm">جاري تحميل الفروع…</div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-2 ${selectAll ? "opacity-50 pointer-events-none" : ""}`}>
              {branches.map((b) => {
                const checked = branchIds.includes(b._id);
                return (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => toggleBranch(b._id)}
                    className={`flex items-center justify-between border rounded-xl px-3 py-2 text-sm bg-white hover:bg-gray-50 ${
                      checked ? "border-gray-900" : "border-gray-200"
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                );
              })}

              {!branches.length && (
                <div className="text-gray-500 text-sm italic md:col-span-3">لا توجد فروع</div>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeAttachments}
              onChange={(e) => setIncludeAttachments(e.target.checked)}
            />
            تضمين المرفقات داخل الـ ZIP
          </label>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60"
          >
            <Download size={16} />
            {downloading ? "جاري التحميل…" : "تحميل النسخة الاحتياطية ZIP"}
          </button>
        </div>
      </section>

      {/* Notes */}
      <section className="bg-white/70 backdrop-blur rounded-2xl border border-white/70 shadow-sm p-5 text-sm text-gray-700">
        <div className="font-semibold mb-2">ملاحظات سريعة:</div>
        <ul className="list-disc pr-5 space-y-1">
          <li>لو فعلت “تحميل الكل” هيبقى param = branches=all.</li>
          <li>الملف بيتنزل كـ ZIP مباشرة (Streaming) بدون ما يتخزن على السيرفر.</li>
          <li>لو المرفقات كتير جدًا، الأفضل تعمل فترة أصغر (مثلاً أسبوع بدل شهر).</li>
        </ul>
      </section>
    </div>
  );
}
