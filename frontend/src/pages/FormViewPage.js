// src/pages/FormViewPage.js
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ReceiptText, Building2, User2, CalendarDays, Wallet, Paperclip, ShieldCheck, Clock3 } from "lucide-react";
import { apiUrl } from "../App";
import { BrandPageStyle } from "./brandTheme";

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

  function getApprovalStatus(f) {
    if (f.accountantRelease?.status === "rejected") {
      return { text: "تم رفضها من المحاسب", color: "text-blue-700", overall: "rejected" };
    }
    if (f.branchManagerRelease?.status === "rejected") {
      return { text: "تم رفضها من مدير الفرع", color: "text-blue-700", overall: "rejected" };
    }
    if (f.adminRelease?.status === "rejected") {
      return { text: "تم رفضها من الأدمن", color: "text-blue-700", overall: "rejected" };
    }
    if (f.adminRelease?.status === "released") {
      return { text: "تم اعتمادها نهائيًا", color: "text-blue-700", overall: "released" };
    }
    if (f.branchManagerRelease?.status === "released") {
      return { text: "في انتظار اعتماد الأدمن", color: "text-blue-700", overall: "pending" };
    }
    if (f.accountantRelease?.status === "released") {
      return { text: "في انتظار اعتماد مدير الفرع", color: "text-blue-700", overall: "pending" };
    }
    return { text: "في انتظار مراجعة المحاسب", color: "text-slate-500", overall: "pending" };
  }

  if (loading) {
    return (
      <div className="brand-app min-h-screen flex items-center justify-center" dir="rtl">
        <BrandPageStyle />
        <div className="brand-card px-8 py-6 text-slate-600 font-semibold">جاري تحميل الفاتورة...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="brand-app min-h-screen flex items-center justify-center" dir="rtl">
        <BrandPageStyle />
        <div className="brand-card px-8 py-6 text-slate-600 font-semibold">لم يتم العثور على الفاتورة</div>
      </div>
    );
  }

  const approval = getApprovalStatus(form);
  const accountant = form.accountantRelease?.status;
  const branch = accountant === "rejected" ? "rejected" : form.branchManagerRelease?.status;
  const admin = accountant === "rejected" ? "rejected" : form.adminRelease?.status;

  const approvalSteps = [
    { label: "المحاسب", value: accountant || "—" },
    { label: "مدير الفرع", value: branch || "—" },
    { label: "الأدمن", value: admin || "—" },
  ];

  return (
    <div className="brand-app min-h-screen py-8 px-4" dir="rtl">
      <BrandPageStyle />

      <div className="max-w-6xl mx-auto space-y-6">
        <section className="brand-panel p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-semibold">
                <ReceiptText size={16} />
                تفاصيل التقرير
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-black">
                التقرير رقم #{form._id?.slice(-6)}
              </h1>
              <p className="mt-3 text-white/80 max-w-2xl">
                شاشة عرض أنظف وأكثر وضوحًا لقراءة بيانات التقرير، حالة الاعتماد، والمرفقات في تسلسل بصري أقوى.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 border border-white/10 px-5 py-4 min-w-[260px]">
              <div className="text-white/65 text-sm">الحالة الحالية</div>
              <div className={`mt-2 text-xl font-extrabold ${approval.color.replace("text-", "text-white/") === approval.color ? "text-white" : "text-white"}`}>
                {approval.text}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_.7fr] gap-6">
          <div className="space-y-6">
            <div className="brand-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck size={18} className="text-[#0B4E8A]" />
                <h2 className="brand-title text-xl">البيانات الأساسية</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBox icon={<Building2 size={18} />} label="الفرع" value={form.branch?.name || "-"} />
                <InfoBox icon={<User2 size={18} />} label="المستخدم" value={form.user?.name || "-"} />
                <InfoBox icon={<CalendarDays size={18} />} label="التاريخ" value={new Date(form.formDate).toLocaleDateString()} />
                <InfoBox icon={<Wallet size={18} />} label="المبلغ" value={form.totalSales || "-"} />
              </div>

              <div className="mt-5 brand-soft p-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">الملاحظات</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">{form.notes || "-"}</div>
              </div>
            </div>

            <div className="brand-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Paperclip size={18} className="text-[#0B4E8A]" />
                <h2 className="brand-title text-xl">المرفقات</h2>
              </div>

              {form.attachments?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {form.attachments.map((file, i) => (
                    <a
                      key={i}
                      href={`${apiUrl}/uploads/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brand-soft overflow-hidden group"
                    >
                      <img
                        src={`${apiUrl}/uploads/${file}`}
                        alt={`attachment-${i}`}
                        className="w-full h-40 object-cover group-hover:scale-[1.02] transition"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="brand-soft p-5 text-sm text-slate-500">لا توجد مرفقات لهذا التقرير.</div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="brand-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock3 size={18} className="text-[#0B4E8A]" />
                <h2 className="brand-title text-xl">مسار الاعتماد</h2>
              </div>

              <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${approval.color} bg-slate-50 border border-slate-200`}>
                <ShieldCheck size={16} />
                {approval.text}
              </div>

              <div className="space-y-3">
                {approvalSteps.map((step, index) => (
                  <div key={step.label} className="brand-soft p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">المرحلة {index + 1}</div>
                      <div className="font-bold text-slate-800 mt-1">{step.label}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-700">{step.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="brand-soft p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="text-[#0B4E8A]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-bold text-slate-800">{value}</div>
    </div>
  );
}
