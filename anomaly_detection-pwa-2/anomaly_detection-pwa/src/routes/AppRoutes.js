import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Pages & Forms
import LoginForm from "../form/_LoginForm";
import RegisterForm from "../form/_RegisterForm";
import Dashboard from "../pages/_Dashboard";
import Camera from "../pages/_Camera";
import Alert from "../pages/_Alert";
import Settings from "../pages/_Settings";
import SystemUsers from "../pages/admin/_SystemUsers"; // Admin page

// Layouts
import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";

// Utilities
import { ToastContainer } from "react-toastify";
import useAuthStatus from "../hooks/useAuthStatus";

/* =====================
   ROUTE GUARDS
===================== */

// Basic auth protection
const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Admin-only protection
const AdminRoute = ({ user, role, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
};

/* =====================
   LOADER & ROOT HANDLER
===================== */

// Loader to prevent any render before role is ready
const AuthLoader = ({ loading, user, role, children }) => {
  if (loading || (user && !role)) {
    return (
      <div className="flex h-screen items-center justify-center text-xl font-semibold">
        Checking authentication...
      </div>
    );
  }
  return children;
};

// RootHandler to redirect admin or render dashboard
const RootHandler = ({ role }) => {
  if (!role || role === "guest") return null;
  if (role === "admin") return <Navigate to="/system-users" replace />;
  return <Dashboard />;
};

/* =====================
   MAIN ROUTER
===================== */

const AppRoutes = () => {
  const { user, role, loading } = useAuthStatus();

  return (
    <div>
      <ToastContainer theme="dark" />

      <AuthLoader loading={loading} user={user} role={role}>
        <Routes>
          {/* ================= PUBLIC ================= */}
          <Route
            path="/login"
            element={
              !user ? (
                <AuthLayout>
                  <LoginForm />
                </AuthLayout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/register"
            element={
              !user ? (
                <AuthLayout>
                  <RegisterForm />
                </AuthLayout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* ================= PROTECTED ================= */}
          <Route
            element={
              <ProtectedRoute user={user}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* ROOT DASHBOARD LOGIC */}
            <Route path="/" element={<RootHandler role={role} />} />

            {/* USER PAGES */}
            <Route path="/camera" element={<Camera />} />
            <Route path="/alert" element={<Alert />} />
            <Route path="/settings" element={<Settings />} />

            {/* ADMIN PAGE */}
            <Route
              path="/system-users"
              element={
                <AdminRoute user={user} role={role}>
                  <SystemUsers />
                </AdminRoute>
              }
            />
          </Route>

          {/* ================= FALLBACK ================= */}
          <Route
            path="*"
            element={<Navigate to={user ? "/" : "/login"} replace />}
          />
        </Routes>
      </AuthLoader>
    </div>
  );
};

export default AppRoutes;
