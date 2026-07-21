import { ShellLayout, type NavItem } from "../../components/Shell";

const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: "📊" },
  { label: "Organizations", to: "/admin/organizations", icon: "🏢" },
  { label: "Businesses", to: "/admin/businesses", icon: "🏪" },
  { label: "Payments", to: "/admin/payments", icon: "💳" },
  { label: "Plans", to: "/admin/plans", icon: "📦" },
  { label: "Branding", to: "/admin/branding", icon: "🎨" },
  { label: "Feature Flags", to: "/admin/feature-flags", icon: "🚩" },
  { label: "Invoices", to: "/admin/invoices", icon: "🧾" },
  { label: "Usage", to: "/admin/usage", icon: "📈" },
  { label: "Customer Success", to: "/admin/customer-success", icon: "💚" },
  { label: "Monitoring", to: "/admin/monitoring", icon: "🖥️" },
  { label: "Deployment", to: "/admin/deployment", icon: "🚀" },
  { label: "Audit Logs", to: "/admin/audit", icon: "📜" },
  { label: "Admins", to: "/admin/admins", icon: "👤" },
];

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  return <ShellLayout nav={adminNav} title={title}>{children}</ShellLayout>;
}
