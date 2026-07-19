import { ShellLayout, type NavItem } from "../../components/Shell";

const partnerNav: NavItem[] = [
  { label: "Dashboard", to: "/partner", icon: "📊" },
  { label: "Businesses", to: "/partner/businesses", icon: "🏪" },
  { label: "Team", to: "/partner/team", icon: "👥" },
  { label: "Payments", to: "/partner/payments", icon: "💳" },
  { label: "Billing", to: "/partner/billing", icon: "📦" },
  { label: "Settings", to: "/partner/settings", icon: "⚙️" },
];

export default function PartnerShell({ children, title }: { children: React.ReactNode; title: string }) {
  return <ShellLayout nav={partnerNav} title={title}>{children}</ShellLayout>;
}
