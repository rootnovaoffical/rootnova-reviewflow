import { Routes, Route, Navigate } from "react-router-dom";
import PublicReviewPage from "./pages/PublicReviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/review/:slug" element={<PublicReviewPage />} />
      <Route path="/" element={<Navigate to="/review/happy-hour-cafe" replace />} />
      <Route path="*" element={<Navigate to="/review/happy-hour-cafe" replace />} />
    </Routes>
  );
}
