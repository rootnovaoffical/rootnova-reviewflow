import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute, { defaultPathForRole } from "./components/ProtectedRoute";
import SpatialBackground from "./components/SpatialBackground";
import { Loading } from "./components/States";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Invite from "./pages/Invite";
import PublicReviewPage from "./pages/PublicReviewPage";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrganizations from "./pages/admin/Organizations";
import AdminOrganizationDetail from "./pages/admin/OrganizationDetail";
import AdminBusinesses from "./pages/admin/Businesses";
import AdminBusinessDetail from "./pages/admin/BusinessDetail";
import AdminPayments from "./pages/admin/Payments";
import AdminPaymentDetail from "./pages/admin/PaymentDetail";
import AdminPlans from "./pages/admin/Plans";
import AdminBranding from "./pages/admin/Branding";
import AdminFeatureFlags from "./pages/admin/FeatureFlags";
import AdminAudit from "./pages/admin/Audit";
import AdminAdmins from "./pages/admin/Admins";

import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerBusinesses from "./pages/partner/Businesses";
import PartnerNewBusiness from "./pages/partner/NewBusiness";
import PartnerBusinessDetail from "./pages/partner/BusinessDetail";
import PartnerTeam from "./pages/partner/Team";
import PartnerPayments from "./pages/partner/Payments";
import PartnerBilling from "./pages/partner/Billing";
import PartnerSettings from "./pages/partner/Settings";

import BusinessDashboard from "./pages/business/Dashboard";
import BusinessMyBusiness from "./pages/business/MyBusiness";
import BusinessQuestions from "./pages/business/Questions";
import BusinessReviews from "./pages/business/Reviews";
import BusinessAnalytics from "./pages/business/Analytics";
import BusinessSettings from "./pages/business/Settings";
import BusinessAIChat from "./pages/business/AIChat";

const ADMIN_ROLES = ["ROOTNOVA_SUPER_ADMIN", "ROOTNOVA_ADMIN"] as const;
const PARTNER_ROLES = ["PARTNER_OWNER", "PARTNER_ADMIN", "PARTNER_TEAM_MEMBER"] as const;
const PARTNER_MANAGE_ROLES = ["PARTNER_OWNER", "PARTNER_ADMIN"] as const;
const BUSINESS_ROLES = ["BUSINESS_ADMIN"] as const;

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={defaultPathForRole(profile?.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BrandingProvider>
          <AuthProvider>
            <div className="relative min-h-screen">
              <SpatialBackground />
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/invite" element={<Invite />} />
                <Route path="/r/:slug" element={<PublicReviewPage />} />

                <Route path="/admin" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/organizations" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminOrganizations /></ProtectedRoute>} />
                <Route path="/admin/organizations/:id" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminOrganizationDetail /></ProtectedRoute>} />
                <Route path="/admin/businesses" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminBusinesses /></ProtectedRoute>} />
                <Route path="/admin/businesses/:id" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminBusinessDetail /></ProtectedRoute>} />
                <Route path="/admin/payments" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminPayments /></ProtectedRoute>} />
                <Route path="/admin/payments/:id" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminPaymentDetail /></ProtectedRoute>} />
                <Route path="/admin/plans" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminPlans /></ProtectedRoute>} />
                <Route path="/admin/branding" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminBranding /></ProtectedRoute>} />
                <Route path="/admin/feature-flags" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminFeatureFlags /></ProtectedRoute>} />
                <Route path="/admin/audit" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminAudit /></ProtectedRoute>} />
                <Route path="/admin/admins" element={<ProtectedRoute roles={["ROOTNOVA_SUPER_ADMIN"]}><AdminAdmins /></ProtectedRoute>} />

                <Route path="/partner" element={<ProtectedRoute roles={[...PARTNER_ROLES]}><PartnerDashboard /></ProtectedRoute>} />
                <Route path="/partner/businesses" element={<ProtectedRoute roles={[...PARTNER_ROLES]}><PartnerBusinesses /></ProtectedRoute>} />
                <Route path="/partner/businesses/new" element={<ProtectedRoute roles={[...PARTNER_MANAGE_ROLES]}><PartnerNewBusiness /></ProtectedRoute>} />
                <Route path="/partner/businesses/:id" element={<ProtectedRoute roles={[...PARTNER_ROLES]}><PartnerBusinessDetail /></ProtectedRoute>} />
                <Route path="/partner/team" element={<ProtectedRoute roles={[...PARTNER_MANAGE_ROLES]}><PartnerTeam /></ProtectedRoute>} />
                <Route path="/partner/payments" element={<ProtectedRoute roles={[...PARTNER_MANAGE_ROLES]}><PartnerPayments /></ProtectedRoute>} />
                <Route path="/partner/billing" element={<ProtectedRoute roles={[...PARTNER_MANAGE_ROLES]}><PartnerBilling /></ProtectedRoute>} />
                <Route path="/partner/settings" element={<ProtectedRoute roles={[...PARTNER_ROLES]}><PartnerSettings /></ProtectedRoute>} />

                <Route path="/business" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessDashboard /></ProtectedRoute>} />
                <Route path="/business/my-business" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessMyBusiness /></ProtectedRoute>} />
                <Route path="/business/questions" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessQuestions /></ProtectedRoute>} />
                <Route path="/business/reviews" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessReviews /></ProtectedRoute>} />
                <Route path="/business/analytics" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessAnalytics /></ProtectedRoute>} />
                <Route path="/business/settings" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessSettings /></ProtectedRoute>} />
                <Route path="/business/ai-chat" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessAIChat /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrandingProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
