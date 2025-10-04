// src/pages/FormViewPage.js
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiUrl } from "../App";

export default function FormViewPage() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${apiUrl}/api/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm(res.data);
      } catch (e) {
        console.error("Error loading form:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        <i className="fas fa-spinner fa-spin mr-2"></i> جاري تحميل الفاتورة...
      </div>
    );

  if (!form)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        <i className="fas fa-exclamation-triangle mr-2"></i> لم يتم العثور على الفاتورة
      </div>
    );

  // 🧩 تحليل الحالة المنطقية العامة
  function getApprovalStatus(f) {
    // 🟥 أولوية قصوى لرفض المحاسب
    if (f.accountantRelease?.status === "rejected") {
      return {
        text: "❌ تم رفضها من المحاسب",
        color: "text-rose-600",
        overall: "rejected",
      };
    }

    // 🟧 ثم رفض مدير الفرع
    if (f.branchManagerRelease?.status === "rejected") {
      return {
        text: "❌ تم رفضها من مدير الفرع",
        color: "text-rose-600",
        overall: "rejected",
      };
    }

    // 🟦 ثم رفض الأدمن
    if (f.adminRelease?.status === "rejected") {
      return {
        text: "❌ تم رفضها من الأدمن",
        color: "text-rose-600",
        overall: "rejected",
      };
    }

    // ✅ تم الاعتماد النهائي
    if (f.adminRelease?.status === "released") {
      return {
        text: "✅ تم اعتمادها نهائيًا",
        color: "text-green-600",
        overall: "released",
      };
    }

    // 🕒 في انتظار الأدمن
    if (f.branchManagerRelease?.status === "released") {
      return {
        text: "🕒 في انتظار اعتماد الأدمن",
        color: "text-amber-600",
        overall: "pending",
      };
    }

    // 🕒 في انتظار مدير الفرع
    if (f.accountantRelease?.status === "released") {
      return {
        text: "🕒 في انتظار اعتماد مدير الفرع",
        color: "text-amber-600",
        overall: "pending",
      };
    }

    // ⏳ في انتظار المحاسب
    return {
      text: "⏳ في انتظار مراجعة المحاسب",
      color: "text-gray-500",
      overall: "pending",
    };
  }

  const approval = getApprovalStatus(form);

  // 💡 في حالة رفض المحاسب: اعتبر الجميع "مرفوض"
  const accountant = form.accountantRelease?.status;
  const branch = accountant === "rejected" ? "rejected" : form.branchManagerRelease?.status;
  const admin = accountant === "rejected" ? "rejected" : form.adminRelease?.status;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6 my-10 space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800 mb-4">
        <i className="fas fa-file-invoice-dollar mr-2"></i>
        تفاصيل الفاتورة رقم #{form._id?.slice(-6)}
      </h2>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
        <div><b>الفرع:</b> {form.branch?.name || "-"}</div>
        <div><b>المستخدم:</b> {form.user?.name || "-"}</div>
        <div><b>التاريخ:</b> {new Date(form.formDate).toLocaleDateString()}</div>
        <div><b>المبلغ:</b> {form.totalSales || "-"}</div>
        <div className="col-span-2"><b>الملاحظات:</b> {form.notes || "-"}</div>
      </div>

      <hr className="my-4" />

      {/* 🧾 حالة الموافقات */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">📊 الحالة الإجمالية:</h3>
        <div className={`text-sm font-semibold ${approval.color}`}>
          {approval.text}
        </div>

        <hr className="my-2" />

        <h3 className="font-semibold text-gray-800 mb-1">تفاصيل الموافقات:</h3>
        <ul className="space-y-1 text-sm">
          <li>👔 محاسب: {accountant || "—"}</li>
          <li>🏢 مدير الفرع: {branch || "—"}</li>
          <li>🧑‍💼 الأدمن: {admin || "—"}</li>
        </ul>
      </div>

      {/* 📎 المرفقات */}
      {form.attachments?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mt-4 mb-2">📎 المرفقات:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {form.attachments.map((file, i) => (
              <a
                key={i}
                href={`${apiUrl}/uploads/${file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <img
                  src={`${apiUrl}/uploads/${file}`}
                  alt={`attachment-${i}`}
                  className="w-full h-32 object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
