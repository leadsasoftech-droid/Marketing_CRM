import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SendMessagePage from "./pages/SendMessagePage";
import BulkMessagePage from "./pages/BulkMessagePage";
import SentHistoryPage from "./pages/SentHistoryPage";
import UserManagementPage from "./pages/UserManagementPage";
import RolesPage from "./pages/RolesPage";
import ProviderSettingsPage from "./pages/ProviderSettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="send-message" element={<SendMessagePage />} />
              <Route path="bulk-message" element={<BulkMessagePage />} />
              <Route path="sent-history" element={<SentHistoryPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
                <Route path="users" element={<UserManagementPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="provider" element={<ProviderSettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
