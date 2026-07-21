import { Routes, Route, Navigate } from "react-router-dom";
import PublicReviewPage from "./pages/PublicReviewPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/review/:slug" element={<PublicReviewPage />} />
      <Route path="/review" element={<PublicReviewPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
