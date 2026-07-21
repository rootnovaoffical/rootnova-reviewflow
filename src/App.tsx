import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PublicReviewPage from "./pages/PublicReviewPage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/review/:slug" element={<PublicReviewPage />} />
      <Route path="/review" element={<PublicReviewPage />} />
      <Route path="/dashboard" element={loading ? <Navigate to="/" replace /> : user ? <DashboardPage /> : <Navigate to="/" replace />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
