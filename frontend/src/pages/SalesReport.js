import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Filter, Download } from "lucide-react";

export default function SalesReport({ api }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("summary"); // summary | detailed
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState({ apps: [], banks: [] });

  const firstLoad = useRef(true);

  /* ================= Load Branches ================= */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/branches");
        const payload = res.data?.data || res.data;
        setBranches(payload || []);
      } catch (e) {
        console.error("Load branches error", e);
      }
    })();
  }, [api]);

  /* ================= Selected Branch Names ================= */
  const selectedBranchNames = useMemo(() => {
    return branches
      .filter((b) => selectedBranches.includes(b._id))
      .map((b) => b.name);
  }, [branches, selectedBranches]);

  /* ================= Load Report ================= */
  const loadTable = useCallback(async () => {
    if (!selectedBranches.length || !from || !to) return;

    try {
      setLoading(true);

      const res = await api.get("/api/admin/sales-report-preview", {
        params: {
          branches: selectedBranches.join(","),
          from,
          to,
          mode,
        },
      });

      let payload = res.data?.data || res.data;

      if (payload && payload.data && !payload.rows && !payload.columns) {
        payload = payload.data;
      }

      // SUMMARY => Array
      if (Array.isArray(payload)) {
        setColumns({ apps: [], banks: [] });
        setRows(payload);
        return;
      }

      // DETAILED => { columns, rows }
      setColumns(payload.columns || { apps: [], banks: [] });
      setRows(payload.rows || []);
    } catch (e) {
      console.error("Load report error", e);
      setRows([]);
      setColumns({ apps: [], banks: [] });
    } finally {
      setLoading(false);
    }
  }, [api, selectedBranches, from, to, mode]);

  /* ================= Auto Reload ================= */
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }

    setRows([]);
    setColumns({ apps: [], banks: [] });
    loadTable();
  }, [mode, from, to, selectedBranches, loadTable]);

  /* ================= Export Excel ================= */
  const exportExcel = async () => {
    if (!selectedBranches.length || !from || !to) {
      alert("حدد الفروع والفترة قبل التصدير");
      return;
    }

    try {
      const res = await api.get("/api/admin/sales-report", {
        params: {
          branches: selectedBranches.join(","),
          from,
          to,
          mode,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `sales-report-${mode === "summary" ? "summary" : "detailed"}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Export excel error", e);
      alert("فشل تصدير ملف الإكسيل");
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= Header ================= */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 تقرير المبيعات</h1>
      </div>

      {/* ================= Filters ================= */}
      <section className="bg-white/80 backdrop-blur rounded-2xl border shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter size={16} />
          <b>الفلاتر</b>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
          {/* Branches */}
          <select
            multiple
            className="border rounded-xl p-2 h-32 text-sm"
            value={selectedBranches}
            onChange={(e) =>
              setSelectedBranches(
                Array.from(e.target.selectedOptions, (o) => o.value)
              )
            }
          >
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Dates */}
          <input
            type="date"
            className="border rounded-xl p-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            type="date"
            className="border rounded-xl p-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          {/* Mode */}
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "summary"}
                onChange={() => setMode("summary")}
              />
              تقرير موجز
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "detailed"}
                onChange={() => setMode("detailed")}
              />
              تقرير مفصل
            </label>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={loadTable}
              className="bg-gray-900 text-white px-4 py-2 rounded-xl"
            >
              تحديث يدوي
            </button>

            <button
              onClick={exportExcel}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl inline-flex items-center gap-2"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>
      </section>

      {/* ================= Report Header ================= */}
      <section className="bg-white rounded-2xl border shadow-sm p-6 flex items-center gap-6">
        <img src="/tahseely.png" alt="Tahseely" className="h-16" />
        <div>
          <h2 className="text-xl font-bold">تقرير مبيعات الفروع</h2>
          <p className="text-gray-600">
            الفروع: <b>{selectedBranchNames.join(" ، ") || "—"}</b>
          </p>
          <p className="text-gray-600">
            من <b>{from || "—"}</b> إلى <b>{to || "—"}</b>
          </p>
          <p className="text-gray-600">
            النوع:{" "}
            <b>
              {mode === "summary"
                ? "موجز (إجماليات)"
                : "مفصل (عمود لكل طريقة)"}
            </b>
          </p>
        </div>
      </section>

      {/* ================= Table ================= */}
      <section className="bg-white rounded-2xl border shadow-sm p-4 overflow-x-auto">
        <h3 className="text-md font-semibold mb-3">نتائج التقرير</h3>

        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">التاريخ</th>
              <th className="border p-2">الفرع</th>
              <th className="border p-2">رقم التقرير</th>
              <th className="border p-2">كاش</th>

              {mode === "summary" ? (
                <>
                  <th className="border p-2">تطبيقات (إجمالي)</th>
                  <th className="border p-2">بنك (إجمالي)</th>
                </>
              ) : (
                <>
                  {columns.apps.map((name) => (
                    <th key={`app-${name}`} className="border p-2">
                      تطبيق – {name}
                    </th>
                  ))}
                  {columns.banks.map((name) => (
                    <th key={`bank-${name}`} className="border p-2">
                      بنك – {name}
                    </th>
                  ))}
                </>
              )}

              <th className="border p-2">الإجمالي</th>
              <th className="border p-2">مشتريات</th>
              <th className="border p-2">عهدة</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={50} className="p-4 text-center">
                  جاري التحميل…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row, i) => (
                <tr key={i} className="text-center border-t">
                  <td className="border p-2">{row.date}</td>
                  <td className="border p-2">{row.branch}</td>
                  <td className="border p-2">{row.serial}</td>
                  <td className="border p-2">{row.cash}</td>

                  {mode === "summary" ? (
                    <>
                      <td className="border p-2">{row.apps ?? 0}</td>
                      <td className="border p-2">{row.bank ?? 0}</td>
                    </>
                  ) : (
                    <>
                      {columns.apps.map((name) => (
                        <td key={`appv-${name}`} className="border p-2">
                          {row[`app_${name}`] ?? 0}
                        </td>
                      ))}
                      {columns.banks.map((name) => (
                        <td key={`bankv-${name}`} className="border p-2">
                          {row[`bank_${name}`] ?? 0}
                        </td>
                      ))}
                    </>
                  )}

                  <td className="border p-2">{row.total}</td>
                  <td className="border p-2">{row.purchases}</td>
                  <td className="border p-2">{row.petty}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={50} className="p-4 text-center text-gray-500">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
