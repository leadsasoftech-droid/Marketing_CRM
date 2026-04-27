import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const { hasToken, isAuthenticated, isBootstrapping, user } = useAuth();

  if (hasToken && isBootstrapping) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl px-6 py-5 shadow-sm">
          <p className="text-sm text-on-surface">Checking your CRM session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
