// ============================================================
// MODULE 14 — MOBILE SHELL
// Bottom-tab navigation, mobile-optimized layout, offline indicator
// ============================================================

import { type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMobile } from "../context/MobileContext";
import { useAuth } from "../context/AuthContext";
import { cacheBustUrl } from "../lib/utils";
import { useBranding } from "../context/BrandingContext";

interface MobileTab {
  label: string;
  to: string;
  icon: string;
  badge?: number;
}

interface MobileShellProps {
  children: ReactNode;
  title: string;
  showTabs?: boolean;
  backTo?: string;
}

export default function MobileShell({ children, title, showTabs = true, backTo }: MobileShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, pendingActions, unreadNotifications } = useMobile();
  const { profile, signOut } = useAuth();
  const { logoPrimary } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs: MobileTab[] = [
    { label: "Home", to: "/mobile", icon: "📊" },
    { label: "Reviews", to: "/mobile/reviews", icon: "⭐" },
    { label: "AI", to: "/mobile/ai", icon: "🤖" },
    { label: "Notify", to: "/mobile/notifications", icon: "🔔", badge: unreadNotifications || undefined },
    { label: "More", to: "/mobile/more", icon: "☰" },
  ];

  const isActive = (to: string) => location.pathname === to || (to !== "/mobile" && location.pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          {backTo && (
            <button onClick={() => navigate(backTo)} className="text-slate-400 hover:text-white p-1 -ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {logoPrimary ? (
            <img src={cacheBustUrl(logoPrimary) ?? undefined} alt="Logo" className="h-7 w-auto" />
          ) : (
            <span className="text-white font-bold text-sm">RootNova</span>
          )}
          <span className="text-slate-600 text-xs">ReviewFlow</span>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10">Offline</span>
          )}
          {pendingActions > 0 && (
            <span className="text-sky-400 text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/10">{pendingActions} queued</span>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-slate-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      {/* Page title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-white">{title}</h1>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 px-4">{children}</main>

      {/* Quick menu dropdown */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-14 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-sm text-white font-medium truncate">{profile?.full_name ?? "User"}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            </div>
            <button onClick={() => { setMenuOpen(false); navigate("/mobile/settings"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Settings</button>
            <button onClick={() => { setMenuOpen(false); navigate("/mobile/profile"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Profile</button>
            <button onClick={() => { setMenuOpen(false); signOut(); }} className="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-white/5">Sign Out</button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      {showTabs && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-950/95 backdrop-blur-md border-t border-white/5 flex items-center justify-around h-16 z-30 px-2">
          {tabs.map((tab) => {
            const active = isActive(tab.to);
            return (
              <Link key={tab.to} to={tab.to} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all">
                <span className={`text-lg transition-all ${active ? "scale-110" : "opacity-60"}`}>{tab.icon}</span>
                <span className={`text-[10px] font-medium ${active ? "text-primary-400" : "text-slate-500"}`}>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-1 ml-6 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{tab.badge > 9 ? "9+" : tab.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
