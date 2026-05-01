import {
  Clock3,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
} from "lucide-react";

function Step({ label, at, icon, color, softColor, muted }) {
  return (
    <li className="relative mb-6 ms-6">
      <span
        className={`absolute -start-3 top-0 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white text-white shadow-sm ${color} ${
          muted ? "opacity-50" : ""
        }`}
      >
        {icon}
      </span>

      <div
        className={`rounded-2xl border px-4 py-3 shadow-sm ${softColor} ${
          muted ? "opacity-60" : ""
        }`}
      >
        <div className="font-semibold text-slate-800">{label}</div>
        {at && (
          <div className="mt-1 text-xs text-slate-500">
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
  const acc = form?.accountantRelease || {};
  const mgr = form?.branchManagerRelease || {};
  const admin = form?.adminRelease || {};

  const steps = [];

  steps.push(
    <Step
      key="created"
      label="تم إنشاء التقرير"
      at={form?.createdAt}
      icon={<FileText size={14} />}
      color="bg-slate-500"
      softColor="bg-slate-50 border-slate-200"
    />
  );

  if (!acc.status || acc.status === "pending") {
    steps.push(
      <Step
        key="acc-pending"
        label="في انتظار اعتماد المحاسب"
        icon={<Clock3 size={14} />}
        color="bg-amber-500"
        softColor="bg-amber-50 border-amber-200"
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
        color="bg-sky-700"
        softColor="bg-sky-50 border-sky-200"
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
        softColor="bg-rose-50 border-rose-200"
      />
    );
    return render(steps);
  }

  if (!mgr.status || mgr.status === "pending") {
    steps.push(
      <Step
        key="mgr-pending"
        label="في انتظار اعتماد مدير الفرع"
        icon={<Clock3 size={14} />}
        color="bg-amber-500"
        softColor="bg-amber-50 border-amber-200"
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
        color="bg-cyan-700"
        softColor="bg-cyan-50 border-cyan-200"
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
        softColor="bg-rose-50 border-rose-200"
      />
    );

    steps.push(
      <Step
        key="return-to-acc"
        label="تم إرجاع التقرير إلى المحاسب لإعادة المراجعة"
        icon={<RotateCcw size={14} />}
        color="bg-orange-500"
        softColor="bg-orange-50 border-orange-200"
      />
    );

    return render(steps);
  }

  if (!admin.status || admin.status === "pending") {
    steps.push(
      <Step
        key="admin-pending"
        label="في انتظار اعتماد الأدمن"
        icon={<Clock3 size={14} />}
        color="bg-amber-500"
        softColor="bg-amber-50 border-amber-200"
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
        color="bg-emerald-600"
        softColor="bg-emerald-50 border-emerald-200"
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
        softColor="bg-rose-50 border-rose-200"
      />
    );

    steps.push(
      <Step
        key="return-to-mgr"
        label="تم إرجاع التقرير إلى مدير الفرع"
        icon={<RotateCcw size={14} />}
        color="bg-orange-500"
        softColor="bg-orange-50 border-orange-200"
      />
    );
  }

  return render(steps);
}

function render(steps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Clock3 size={18} />
        </div>
        <div>
          <h4 className="font-bold text-slate-800">سجل حالة التقرير</h4>
          <p className="text-xs text-slate-500">
            تسلسل الاعتماد من الإنشاء حتى القرار النهائي
          </p>
        </div>
      </div>

      <ol className="relative border-s-2 border-slate-200 ms-3">
        {steps}
      </ol>
    </div>
  );
}