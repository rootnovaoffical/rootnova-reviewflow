import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BusinessShell from "./pages/business/BusinessShell";
import AICommandCenter from "./pages/business/AICommandCenter";
import AITaskCenter from "./pages/business/AITaskCenter";
import AIGoals from "./pages/business/AIGoals";
import AIBriefings from "./pages/business/AIBriefings";
import AISimulations from "./pages/business/AISimulations";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/business" replace />} />
        <Route path="/business" element={<BusinessShell />}>
          <Route index element={<AICommandCenter />} />
          <Route path="ai-command" element={<AICommandCenter />} />
          <Route path="ai-tasks" element={<AITaskCenter />} />
          <Route path="ai-goals" element={<AIGoals />} />
          <Route path="ai-briefings" element={<AIBriefings />} />
          <Route path="ai-simulations" element={<AISimulations />} />
          <Route path="reviews" element={<PlaceholderPage title="Reviews" />} />
          <Route path="communication" element={<PlaceholderPage title="Communication" />} />
          <Route path="workflows" element={<PlaceholderPage title="Workflows" />} />
          <Route path="customers" element={<PlaceholderPage title="Customers" />} />
        </Route>
        <Route path="*" element={<Navigate to="/business" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="text-slate-400">This module is part of the locked platform and not modified in this build.</p>
    </div>
  );
}
