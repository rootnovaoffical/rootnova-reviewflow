import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { defaultPathForRole } from "./ProtectedRoute";

interface NavItem { label: string; path: string; }

function navItemsForRole(role?: string): NavItem[] {
  switch (role) {
    case "ROOTNOVA_SUPER_ADMIN":
    case "ROOTNOVA_ADMIN":
      return [
        { label: "Dashboard", path: "/admin" },
        { label: "Organizations", path: "/admin/organizations" },
        { label: "Businesses", path: "/admin/businesses" },
        { label: "Payments", path: "/admin/payments" },
        { label: "Plans", path: "/admin/plans" },
        { label: "Branding", path: "/admin/branding" },
        { label: "Feature Flags", path: "/admin/feature-flags" },
        { label: "Audit Log", path: "/admin/audit" },
        ...(role === "ROOTNOVA_SUPER_ADMIN" ? [{ label: "Admins", path: "/admin/admins" }] : []),
      ];
    case "PARTNER_OWNER":
    case "PARTNER_ADMIN":
    case "PARTNER_TEAM_MEMBER":
      return [
        { label: "Dashboard", path: "/partner" },
        { label: "Businesses", path: "/partner/businesses" },
        ...(role !== "PARTNER_TEAM_MEMBER" ? [{ label: "New Business", path: "/partner/businesses/new" }] : []),
        ...(role !== "PARTNER_TEAM_MEMBER" ? [{ label: "Team", path: "/partner/team" }] : []),
        ...(role !== "PARTNER_TEAM_MEMBER" ? [{ label: "Payments", path: "/partner/payments" }] : []),
        ...(role !== "PARTNER_TEAM_MEMBER" ? [{ label: "Billing", path: "/partner/billing" }] : []),
        { label: "Settings", path: "/partner/settings" },
      ];
    case "BUSINESS_ADMIN":
      return [
        { label: "Dashboard", path: "/business" },
        { label: "My Business", path: "/business/my-business" },
        { label: "Questions", path: "/business/questions" },
        { label: "Reviews", path: "/business/reviews" },
        { label: "Analytics", path: "/business/analytics" },
        { label: "Settings", path: "/business/settings" },
      ];
    default: return [];
  }
}

export default function Layout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = navItemsForRole(profile?.role);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const basePath = defaultPathForRole(profile?.role);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className="w-64 shrink-0 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <Link to={basePath} className="px-6 py-5 border-b border-white/5">
          <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">RootNova</span>
          <span className="text-xs text-slate-500 ml-1">ReviewFlow</span>
        </Link>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
          {items.map((item) => {
            const active = location.pathname === item.path || (item.path !== basePath && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? "bg-primary-600/20 text-primary-300 border border-primary-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar url={profile?.avatar_url} name={profile?.full_name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="mt-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-error-400 hover:bg-error-500/10 rounded-lg transition-colors text-left">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {title && (
          <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl px-8 py-4">
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </header>
        )}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
