// ============================================================
// MODULE 14 — MOBILE MORE MENU
// Hub for all remaining mobile features
// ============================================================

import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import { useMobile } from "../../context/MobileContext";
import { useAuth } from "../../context/AuthContext";

interface MenuItem {
  label: string;
  icon: string;
  to: string;
  description: string;
}

export default function MobileMore() {
  const navigate = useNavigate();
  const { isOnline, pendingActions } = useMobile();
  const { profile } = useAuth();

  const groups: { title: string; items: MenuItem[] }[] = [
    {
      title: "Engagement",
      items: [
        { label: "Customer 360", icon: "🎯", to: "/mobile/customer-360", description: "Customer profiles & history" },
        { label: "Campaigns", icon: "📣", to: "/mobile/campaigns", description: "Create & manage campaigns" },
        { label: "Communication", icon: "📨", to: "/mobile/communication", description: "WhatsApp, SMS, Email" },
        { label: "Loyalty", icon: "🎁", to: "/mobile/loyalty", description: "Loyalty programs" },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "QR Codes", icon: "📱", to: "/mobile/qr", description: "Generate & manage QR codes" },
        { label: "Workflows", icon: "⚡", to: "/mobile/workflows", description: "Automation workflows" },
        { label: "Analytics", icon: "📈", to: "/mobile/analytics", description: "Business intelligence" },
        { label: "Enterprise", icon: "🏛️", to: "/mobile/enterprise", description: "Multi-location management" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Settings", icon: "⚙️", to: "/mobile/settings", description: "App & business settings" },
        { label: "Profile", icon: "👤", to: "/mobile/profile", description: "Your profile" },
      ],
    },
  ];

  return (
    <MobileShell title="More">
      <div className="space-y-6 page-enter">
        {/* Status card */}
        <div className="glass rounded-2xl p-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">{profile?.full_name ?? "User"}</p>
              <p className="text-xs text-slate-500">{profile?.email}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{isOnline ? "Online" : "Offline"}</span>
              {pendingActions > 0 && <span className="text-xs text-sky-400">{pendingActions} queued</span>}
            </div>
          </div>
        </div>

        {/* Menu groups */}
        {groups.map((group, gi) => (
          <div key={group.title} className="animate-fade-up" style={{ animationDelay: `${gi * 80}ms` }}>
            <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-2">{group.title}</h3>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-3 glass rounded-xl p-3 text-left hover:bg-white/10 transition-colors"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
