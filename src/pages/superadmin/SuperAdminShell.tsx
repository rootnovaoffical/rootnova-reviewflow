import { ShellLayout } from "../../components/Shell";
import ProfileMenu from "../../components/ProfileMenu";
import { useBranding } from "../../context/BrandingContext";
import type { ReactNode } from "react";

export default function SuperAdminShell({ children, nav }: { children: ReactNode; nav: { to: string; label: string; icon: ReactNode }[] }) {
  const { logoPrimary } = useBranding();
  return (
    <ShellLayout brandLogo={logoPrimary} brandName="RootNova" nav={nav}>
      <header className="flex items-center justify-end px-8 py-4 border-b border-slate-800">
        <ProfileMenu />
      </header>
      <div className="p-8">{children}</div>
    </ShellLayout>
  );
}
