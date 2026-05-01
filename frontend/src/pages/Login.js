// src/pages/Login.jsx
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, Building2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { BrandPageStyle } from "./brandTheme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

    try {
      const res = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      if (res.data?.user?.name || res.data?.name) {
        localStorage.setItem("userName", res.data?.user?.name || res.data?.name);
      }

      toast.success("تم تسجيل الدخول بنجاح");

      setTimeout(() => {
        if (res.data.role === "User") navigate("/user");
        else if (res.data.role === "Accountant") navigate("/accountant");
        else if (res.data.role === "Admin") navigate("/admin");
        else if (res.data.role === "BranchManager") navigate("/branch-manager");
        else navigate("/");
      }, 900);
    } catch (error) {
      const msg = error.response?.data?.message || "فشل تسجيل الدخول";
      setError(msg);
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brand-app min-h-screen flex items-center justify-center px-4 py-8" dir="rtl">
      <BrandPageStyle />
      <Toaster position="top-center" reverseOrder={false} />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-6 items-stretch">
        <section className="brand-panel relative overflow-hidden p-8 md:p-10 hidden lg:flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-sky-300/10 blur-2xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-semibold">
              <ShieldCheck size={16} />
              نظام تحصيلي لإدارة التحصيل والتقارير
            </div>

            <h1 className="mt-6 text-4xl md:text-5xl font-black leading-tight">
              واجهة دخول احترافية
              <span className="block text-sky-200">بهوية أقوى وتنظيم أوضح</span>
            </h1>

            <p className="mt-5 text-white/80 text-base leading-8 max-w-xl">
              تم إعادة توجيه الشاشة لتناسب طابع الشعار الأزرق وتمنح انطباعًا أكثر ثقة واحترافية، مع
              فصل واضح بين الرسالة التعريفية ومنطقة الإدخال.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 mt-10">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-white/60 text-sm">الوصول</div>
              <div className="mt-1 font-bold">آمن ومنظم</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-white/60 text-sm">التقارير</div>
              <div className="mt-1 font-bold">مراجعة أسرع</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-white/60 text-sm">الفروع</div>
              <div className="mt-1 font-bold">تحكم أوضح</div>
            </div>
          </div>
        </section>

        <section className="brand-card relative overflow-hidden p-6 md:p-8 lg:p-10">
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-blue-700/10 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-8">
              <div>
                <div className="brand-kicker text-sm">تسجيل الدخول</div>
                <h2 className="brand-title text-3xl mt-1">مرحبًا بك</h2>
                <p className="text-slate-500 mt-2 text-sm md:text-base">
                  أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك.
                </p>
              </div>

              <div className="h-14 w-14 rounded-2xl brand-primary-btn flex items-center justify-center shadow-lg">
                <LogIn size={22} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="brand-soft p-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Building2 size={16} className="text-[#0B4E8A]" />
                  تجربة مؤسسية
                </div>
                <div className="mt-2 font-bold text-slate-800">متوافقة مع هوية المشروع</div>
              </div>
              <div className="brand-soft p-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <ShieldCheck size={16} className="text-[#0B4E8A]" />
                  أمان الوصول
                </div>
                <div className="mt-2 font-bold text-slate-800">صلاحيات حسب الدور</div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-sky-50 px-4 py-3 text-sm text-blue-800">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">البريد الإلكتروني</span>
                <div className="flex items-center gap-3 px-4 py-3 brand-soft">
                  <Mail size={18} className="text-[#0B4E8A]" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="outline-none w-full text-sm bg-transparent"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">كلمة المرور</span>
                <div className="flex items-center gap-3 px-4 py-3 brand-soft">
                  <Lock size={18} className="text-[#0B4E8A]" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    className="outline-none w-full text-sm bg-transparent"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="p-2 text-slate-500 hover:text-[#0B4E8A]"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full brand-primary-btn py-3.5 font-bold text-base disabled:opacity-60"
              >
                {loading ? "... جاري تسجيل الدخول" : "دخول إلى النظام"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between gap-3">
              <span>© {new Date().getFullYear()} Tahseely System</span>
              <span>واجهة محدثة بطابع أكثر احترافية</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
