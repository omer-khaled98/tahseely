// src/components/ReportTimeline.jsx
import {
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

function Step({ label, at, icon, color, muted }) {
  return (
    <li className="mb-6 ms-6">
      <span
        className={`absolute -start-3 flex items-center justify-center w-6 h-6 rounded-full text-white ${color} ${
          muted ? "opacity-40" : ""
        }`}
      >
        {icon}
      </span>

      <div className={`text-sm ${muted ? "text-gray-400" : ""}`}>
        <div className="font-medium">{label}</div>
        {at && (
          <div className="text-gray-500 text-xs">
            {new Date(at).toLocaleString("ar-EG", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        )}
      </div>
    </li>
  );
}

export default function ReportTimeline({ form }) {
  const acc = form.accountantRelease || {};
  const mgr = form.branchManagerRelease || {};
  const admin = form.adminRelease || {};

  const steps = [];

  /* ========= إنشاء التقرير ========= */
  steps.push(
    <Step
      key="created"
      label="تم إنشاء التقرير"
      at={form.createdAt}
      icon={<Clock size={14} />}
      color="bg-gray-400"
    />
  );

  /* ========= المحاسب ========= */
  if (!acc.status || acc.status === "pending") {
    steps.push(
      <Step
        key="acc-pending"
        label="في انتظار اعتماد المحاسب"
        icon={<Clock size={14} />}
        color="bg-amber-500"
      />
    );
    return render(steps);
  }

  if (acc.status === "released") {
    steps.push(
      <Step
        key="acc-approved"
        label="تم اعتماد التقرير من المحاسب"
        at={acc.at}
        icon={<CheckCircle2 size={14} />}
        color="bg-emerald-600"
      />
    );
  } else {
    steps.push(
      <Step
        key="acc-rejected"
        label="تم رفض التقرير من المحاسب"
        at={acc.at}
        icon={<XCircle size={14} />}
        color="bg-rose-600"
      />
    );
    return render(steps);
  }

  /* ========= مدير الفرع ========= */
  if (!mgr.status || mgr.status === "pending") {
    steps.push(
      <Step
        key="mgr-pending"
        label="في انتظار اعتماد مدير الفرع"
        icon={<Clock size={14} />}
        color="bg-amber-500"
      />
    );
    return render(steps);
  }

  if (mgr.status === "released") {
    steps.push(
      <Step
        key="mgr-approved"
        label="تم اعتماد التقرير من مدير الفرع"
        at={mgr.at}
        icon={<CheckCircle2 size={14} />}
        color="bg-indigo-600"
      />
    );
  } else {
    steps.push(
      <Step
        key="mgr-rejected"
        label="تم رفض التقرير من مدير الفرع"
        at={mgr.at}
        icon={<XCircle size={14} />}
        color="bg-rose-600"
      />
    );

    steps.push(
      <Step
        key="return-to-acc"
        label="تم إرجاع التقرير إلى المحاسب لإعادة المراجعة"
        icon={<RotateCcw size={14} />}
        color="bg-orange-500"
      />
    );

    return render(steps);
  }

  /* ========= الأدمن ========= */
  if (!admin.status || admin.status === "pending") {
    steps.push(
      <Step
        key="admin-pending"
        label="في انتظار اعتماد الأدمن"
        icon={<Clock size={14} />}
        color="bg-amber-500"
      />
    );
    return render(steps);
  }

  if (admin.status === "released") {
    steps.push(
      <Step
        key="admin-approved"
        label="تم اعتماد التقرير نهائيًا"
        at={admin.at}
        icon={<CheckCircle2 size={14} />}
        color="bg-green-700"
      />
    );
  } else {
    steps.push(
      <Step
        key="admin-rejected"
        label="تم رفض التقرير من الأدمن"
        at={admin.at}
        icon={<XCircle size={14} />}
        color="bg-rose-700"
      />
    );

    steps.push(
      <Step
        key="return-to-mgr"
        label="تم إرجاع التقرير إلى مدير الفرع"
        icon={<RotateCcw size={14} />}
        color="bg-orange-500"
      />
    );
  }

  return render(steps);
}

/* ========= Wrapper ========= */
function render(steps) {
  return (
    <div className="bg-white border rounded-xl p-4 mb-4">
      <h4 className="font-semibold mb-3">سجل حالة التقرير</h4>
      <ol className="relative border-s border-gray-200 ms-3">{steps}</ol>
    </div>
  );
}
