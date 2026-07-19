import { ShellLayout, type NavItem } from "../../components/Shell";

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: "📊" },
  { label: "Organizations", to: "/admin/organizations", icon: "🏢" },
  { label: "Businesses", to: "/admin/businesses", icon: "🏪" },
  { label: "Payments", to: "/admin/payments", icon: "💳" },
  { label: "Plans", to: "/admin/plans", icon: "📦" },
  { label: "Branding", to: "/admin/branding", icon: "🎨" },
  { label: "Feature Flags", to: "/admin/feature-flags", icon: "🚩" },
  { label: "Audit Logs", to: "/admin/audit", icon: "📜" },
  { label: "Admins", to: "/admin/admins", icon: "👤" },
];

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  return <ShellLayout nav={adminNav} title={title}>{children}</ShellLayout>;
}
