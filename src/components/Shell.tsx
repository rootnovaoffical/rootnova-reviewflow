import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import { useBranding } from "../context/BrandingContext";
import { cacheBustUrl } from "../lib/utils";

export interface NavItem { label: string; to: string; icon?: string; }

export function ShellLayout({ children, nav, title }: { children: ReactNode; nav: NavItem[]; title: string }) {
  const { logoPrimary } = useBranding();
  const location = useLocation();
  return (
    <div className="min-h-screen flex bg-slate-950">
      <aside className="w-60 border-r border-slate-800 flex flex-col shrink-0 hidden md:flex">
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2">
          {logoPrimary ? <img src={cacheBustUrl(logoPrimary) ?? undefined} alt="Logo" className="h-8 w-auto" /> : <span className="text-white font-bold text-lg">RootNova</span>}
          <span className="text-slate-500 text-xs">ReviewFlow</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-brand-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {item.icon && <span>{item.icon}</span>}{item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0">
          <h1 className="text-white font-semibold text-sm md:text-base">{title}</h1>
          <ProfileMenu />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="px-4 md:px-8 pt-8 pb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div><p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-white mt-1">{value}</p></div>
        {icon && <span className="text-3xl opacity-50">{icon}</span>}
      </div>
    </Card>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: "slate" | "brand" | "green" | "amber" | "rose" | "blue" }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-700 text-slate-200", brand: "bg-brand-500/20 text-brand-300",
    green: "bg-emerald-500/20 text-emerald-300", amber: "bg-amber-500/20 text-amber-300",
    rose: "bg-rose-500/20 text-rose-300", blue: "bg-blue-500/20 text-blue-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
}
