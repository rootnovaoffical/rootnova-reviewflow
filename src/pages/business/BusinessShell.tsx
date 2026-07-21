import { ShellLayout, type NavItem } from "../../components/Shell";

const businessNav: NavItem[] = [
  { label: "Dashboard", to: "/business", icon: "📊" },
  { label: "My Business", to: "/business/my-business", icon: "🏪" },
  { label: "Questions", to: "/business/questions", icon: "❓" },
  { label: "Reviews", to: "/business/reviews", icon: "⭐" },
  { label: "Actions", to: "/business/actions", icon: "🎯" },
  { label: "Engagement", to: "/business/engagement", icon: "💬" },
  { label: "Communication", to: "/business/communication", icon: "📨" },
  { label: "Workflows", to: "/business/workflows", icon: "⚡" },
  { label: "QR Codes", to: "/business/qr-codes", icon: "📱" },
  { label: "Analytics", to: "/business/analytics", icon: "📈" },
  { label: "Settings", to: "/business/settings", icon: "⚙️" },
];

export default function BusinessShell({ children, title }: { children: React.ReactNode; title: string }) {
  return <ShellLayout nav={businessNav} title={title}>{children}</ShellLayout>;
}
