import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PublicReviewPage from './pages/PublicReviewPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Loading…</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/review/:slug" element={<PublicReviewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
