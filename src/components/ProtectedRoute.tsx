import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "./States";
import type { Role } from "../lib/types";

export function defaultPathForRole(role?: string): string {
  switch (role) {
    case "ROOTNOVA_SUPER_ADMIN":
    case "ROOTNOVA_ADMIN": return "/admin";
    case "PARTNER_OWNER":
    case "PARTNER_ADMIN":
    case "PARTNER_TEAM_MEMBER": return "/partner";
    case "BUSINESS_ADMIN": return "/business";
    default: return "/login";
  }
}

interface Props {
  roles: Role[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { session, profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Loading />;

  if (profile.account_status === "SUSPENDED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4">Account Suspended</h1>
          <p className="text-slate-400">Your account has been suspended. Please contact support.</p>
        </div>
      </div>
    );
  }

  if (!roles.includes(profile.role as Role)) {
    return <Navigate to={defaultPathForRole(profile.role)} replace />;
  }

  return <>{children}</>;
}
