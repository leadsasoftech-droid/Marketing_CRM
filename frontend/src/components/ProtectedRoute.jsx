import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SessionLoader from "./SessionLoader";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const { hasToken, isAuthenticated, isBootstrapping, user } = useAuth();

  if (hasToken && isBootstrapping) {
    return (
      <SessionLoader
        title="Checking your CRM session..."
        subtitle="Verifying your account and loading the dashboard."
      />
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
