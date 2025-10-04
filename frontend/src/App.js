// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BranchManagerDashboard from "./pages/BranchManagerDashboard";
import FormViewPage from "./pages/FormViewPage"; // ✅ صفحة المعاينة الجديدة
import ProtectedRoute from "./ProtectedRoute";

// ✅ متغير عام يحدد الـ API URL حسب المكان اللي الكود شغال فيه
export const apiUrl =
  window.location.hostname === "localhost"
    ? "http://localhost:5000" // لو شغال محلي
    : "https://tahseely.al-hawas-eg.cloud"; // لو شغال على السيرفر

function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ✅ دالة لتوجيه المستخدم حسب دوره
  const getRedirect = () => {
    if (!token) return <Navigate to="/login" replace />;
    if (role === "User") return <Navigate to="/user" replace />;
    if (role === "Accountant") return <Navigate to="/accountant" replace />;
    if (role === "Admin") return <Navigate to="/admin" replace />;
    if (role === "BranchManager") return <Navigate to="/branch-manager" replace />;
    return <Navigate to="/login" replace />;
  };

  return (
    <Router>
      <Routes>
        {/* 🟢 صفحة تسجيل الدخول */}
        <Route path="/login" element={<Login />} />

        {/* 🟢 لوحة المستخدم */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRole="User">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🟢 لوحة المحاسب */}
        <Route
          path="/accountant"
          element={
            <ProtectedRoute allowedRole="Accountant">
              <AccountantDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🟢 لوحة الأدمن */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🟢 لوحة مدير الفرع */}
        <Route
          path="/branch-manager"
          element={
            <ProtectedRoute allowedRole="BranchManager">
              <BranchManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🟣 صفحة معاينة الفاتورة (خاصة بالأدمن فقط) */}
        <Route
          path="/form/:id"
          element={
            <ProtectedRoute allowedRole="Admin">
              <FormViewPage />
            </ProtectedRoute>
          }
        />

        {/* 🟡 التوجيه حسب الدور عند الدخول */}
        <Route path="/" element={getRedirect()} />

        {/* 🔴 أي مسار غير معروف → تحويل إلى Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
