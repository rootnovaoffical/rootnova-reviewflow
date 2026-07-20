import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import { useBranding } from "../context/BrandingContext";
import { cacheBustUrl } from "../lib/utils";

export interface NavItem { label: string; to: string; icon?: ReactNode; }

export function ShellLayout({ children, nav, title, brandLogo: _brandLogo, brandName: _brandName }: { children: ReactNode; nav: NavItem[]; title?: string; brandLogo?: string | null; brandName?: string }) {
  const { logoPrimary } = useBranding();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-white/5 flex items-center gap-2">
        {logoPrimary ? <img src={cacheBustUrl(logoPrimary) ?? undefined} alt="Logo" className="h-8 w-auto" /> : <span className="text-white font-bold text-lg tracking-tight">RootNova</span>}
        <span className="text-slate-600 text-xs font-medium">ReviewFlow</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item, i) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`nav-item-enter group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${active ? "bg-gradient-to-r from-primary-600/30 to-primary-500/10 text-white border border-primary-500/30" : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {item.icon && <span className={`text-base transition-transform duration-200 group-hover:scale-110 ${active ? "" : "opacity-70"}`}>{item.icon}</span>}
              <span className="font-medium">{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="w-60 border-r border-white/5 flex flex-col shrink-0 hidden md:flex bg-slate-950/50 backdrop-blur-sm">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-950 border-r border-white/5 flex flex-col animate-fade-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 bg-slate-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-slate-400 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-white font-semibold text-sm md:text-base">{title}</h1>
          </div>
          <ProfileMenu />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="px-4 md:px-8 pt-8 pb-4 flex items-start justify-between gap-4 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 card-hover ${className}`}>{children}</div>;
}

export function StatCard({ label, value, icon, hint }: { label: string; value: string | number; icon?: ReactNode; hint?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div><p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-white mt-1">{value}</p></div>
        {icon && <span className="text-3xl opacity-50">{icon}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </Card>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: "slate" | "brand" | "green" | "amber" | "rose" | "blue" | "red" | "indigo" | "sky" | "emerald" }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-700 text-slate-200", brand: "bg-brand-500/20 text-brand-300",
    green: "bg-emerald-500/20 text-emerald-300", amber: "bg-amber-500/20 text-amber-300",
    rose: "bg-rose-500/20 text-rose-300", blue: "bg-blue-500/20 text-blue-300", red: "bg-rose-500/20 text-rose-300", indigo: "bg-indigo-500/20 text-indigo-300", sky: "bg-sky-500/20 text-sky-300", emerald: "bg-emerald-500/20 text-emerald-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
}
