import { Routes, Route } from "react-router-dom";
import PublicReviewPage from "./pages/PublicReviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/review/:slug" element={<PublicReviewPage />} />
      <Route path="/" element={<PublicReviewPage />} />
    </Routes>
  );
}
