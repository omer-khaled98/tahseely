/* ---------------- AdminSummary ---------------- */
import React, { useState, useEffect, useMemo } from "react";

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
    appMethod: ""
  });

  const [expandBank, setExpandBank] = useState({});
  const [expandApps, setExpandApps] = useState({});

  const currency = (n) => Number(n || 0).toLocaleString();

  // ======================================================
  // LOAD BRANCHES
  // ======================================================
  useEffect(() => {
    api.get("/api/branches")
      .then(res => setBranches(res.data || []))
      .catch(err => console.error("Branches err:", err));
  }, []);

  // ======================================================
  // LOAD FORMS (ALL / FILTERED)
  // ======================================================
  useEffect(() => {
    setLoading(true);

    const params = { adminStatus: "pending" };

    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.branchId) params.branchId = filter.branchId;

    api.get("/api/forms/admin", { params })
      .then(res => {
        setRows(res.data || []);
      })
      .catch(err => console.error("Forms err:", err))
      .finally(() => setLoading(false));

  }, [filter.startDate, filter.endDate, filter.branchId]);

  // ======================================================
  // SUMMARY ENGINE
  // ======================================================
  const summary = useMemo(() => {

    let grandTotal = 0;
    let count = 0;

    const branchSummary = {};

    rows.forEach(f => {
      const branch = f?.branch?.name || "غير معروف";

      if (!branchSummary[branch]) {
        branchSummary[branch] = {
          cash: 0,
          petty: 0,
          purch: 0,
          appsTotal: 0,
          bankTotal: 0,
          appsDetails: {},
          bankDetails: {}
        };
      }

      const B = branchSummary[branch];

      // ------------------ CASH ------------------
      if (f.cashCollection > 0) {
        B.cash += f.cashCollection;
        grandTotal += f.cashCollection;
        count++;
      }

      // ------------------ PETTY ------------------
      if (f.pettyCash > 0) {
        B.petty += f.pettyCash;
        grandTotal += f.pettyCash;
        count++;
      }

      // ------------------ PURCHASES ------------------
      if (f.purchases > 0) {
        B.purch += f.purchases;
        grandTotal += f.purchases;
        count++;
      }

      // ------------------ APPS ------------------
      (f.applications || []).forEach(a => {
        B.appsTotal += a.amount;
        grandTotal += a.amount;

        if (!B.appsDetails[a.name]) B.appsDetails[a.name] = 0;
        B.appsDetails[a.name] += a.amount;

        count++;
      });

      // ------------------ BANK ------------------
      (f.bankCollections || []).forEach(b => {
        B.bankTotal += b.amount;
        grandTotal += b.amount;

        if (!B.bankDetails[b.name]) B.bankDetails[b.name] = 0;
        B.bankDetails[b.name] += b.amount;

        count++;
      });

    });

    return {
      branchSummary,
      grandTotal,
      count
    };

  }, [rows, filter]);

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl p-6 max-h-[95vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold">ملخص التحصيل</h2>
              <button onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* DATE FILTER */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <input
                type="date"
                value={filter.startDate}
                onChange={e => setFilter(p => ({ ...p, startDate: e.target.value }))}
                className="border p-2 rounded-xl"
              />
              <input
                type="date"
                value={filter.endDate}
                onChange={e => setFilter(p => ({ ...p, endDate: e.target.value }))}
                className="border p-2 rounded-xl"
              />
            </div>

            {/* BRANCH FILTER */}
            <select
              value={filter.branchId}
              onChange={e => setFilter(p => ({ ...p, branchId: e.target.value }))}
              className="border p-2 rounded-xl w-full mb-6"
            >
              <option value="">كل الفروع</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            {/* TOTALS */}
            <div className="p-4 bg-gray-100 rounded-xl border mt-4">

              <h3 className="font-semibold mb-3">الإجمالي العام:</h3>

              <p>
                <b className="text-xl">{currency(summary.grandTotal)}</b> ← إجمالي شامل
              </p>
              <p className="text-sm text-gray-600">عدد السجلات: {summary.count}</p>
            </div>

            {/* BREAKDOWN BY BRANCH */}
            <div className="mt-6">
              <h3 className="font-bold text-lg mb-3">تفصيل حسب الفروع:</h3>

              {Object.keys(summary.branchSummary).map(branch => {
                const B = summary.branchSummary[branch];

                return (
                  <div key={branch} className="bg-gray-50 border p-4 rounded-xl mb-3">

                    <h4 className="font-bold mb-3">{branch}</h4>

                    <div className="space-y-1">
                      <p>نقدي: <b>{currency(B.cash)}</b></p>
                      <p>عهدة: <b>{currency(B.petty)}</b></p>
                      <p>مشتريات: <b>{currency(B.purch)}</b></p>

                      {/* APPS */}
                      <div>
                        <div
                          className="cursor-pointer flex justify-between items-center py-1"
                          onClick={() => setExpandApps(e => ({ ...e, [branch]: !e[branch] }))}
                        >
                          <span>تطبيقات: <b>{currency(B.appsTotal)}</b></span>
                          <span>{expandApps[branch] ? "▲" : "▼"}</span>
                        </div>

                        {expandApps[branch] && (
                          <div className="pl-4 mt-2 space-y-1">
                            {Object.keys(B.appsDetails).map(key => (
                              <p key={key} className="text-sm flex justify-between">
                                <span>{key}</span>
                                <b>{currency(B.appsDetails[key])}</b>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* BANK */}
                      <div>
                        <div
                          className="cursor-pointer flex justify-between items-center py-1"
                          onClick={() => setExpandBank(e => ({ ...e, [branch]: !e[branch] }))}
                        >
                          <span>بنك: <b>{currency(B.bankTotal)}</b></span>
                          <span>{expandBank[branch] ? "▲" : "▼"}</span>
                        </div>

                        {expandBank[branch] && (
                          <div className="pl-4 mt-2 space-y-1">
                            {Object.keys(B.bankDetails).map(key => (
                              <p key={key} className="text-sm flex justify-between">
                                <span>{key}</span>
                                <b>{currency(B.bankDetails[key])}</b>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Branch total */}
                    <div className="text-right mt-3 font-bold text-indigo-600">
                      المجموع الفرعي: {currency(
                        B.cash + B.purch + B.appsTotal + B.bankTotal
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminSummary;
