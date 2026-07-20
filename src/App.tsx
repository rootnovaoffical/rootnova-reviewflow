import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, isRootNovaStaff, isPartnerStaff } from "./lib/auth";
import { FullPageLoader } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./layouts/AdminLayout";
import PartnerLayout from "./layouts/PartnerLayout";
import BusinessLayout from "./layouts/BusinessLayout";
import ReviewPage from "./pages/ReviewPage";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminPayments from "./pages/admin/Payments";
import AdminPaymentDetail from "./pages/admin/PaymentDetail";
import AdminBusinesses from "./pages/admin/Businesses";
import AdminBusinessDetail from "./pages/admin/BusinessDetail";
import AdminOrganizations from "./pages/admin/Organizations";
import AdminOrganizationDetail from "./pages/admin/OrganizationDetail";
import AdminPlans from "./pages/admin/Plans";
import AdminAdmins from "./pages/admin/Admins";
import AdminAudit from "./pages/admin/Audit";
import AdminBranding from "./pages/admin/Branding";
import AdminFeatureFlags from "./pages/admin/FeatureFlags";

// Partner pages
import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerBusinesses from "./pages/partner/Businesses";
import PartnerBusinessDetail from "./pages/partner/BusinessDetail";
import PartnerBilling from "./pages/partner/Billing";
import PartnerPayments from "./pages/partner/Payments";
import PartnerSettings from "./pages/partner/Settings";

// Business pages
import BusinessDashboard from "./pages/business/Dashboard";
import BusinessMyBusiness from "./pages/business/MyBusiness";
import BusinessQuestions from "./pages/business/Questions";
import BusinessReviews from "./pages/business/Reviews";
import BusinessSettings from "./pages/business/Settings";

export default function App() {
  const { profile, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  return (
    <Routes>
      <Route path="/login" element={profile ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/review/:slug" element={<ReviewPage />} />

      {profile && isRootNovaStaff(profile.role) && (
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="payments/:id" element={<AdminPaymentDetail />} />
          <Route path="businesses" element={<AdminBusinesses />} />
          <Route path="businesses/:id" element={<AdminBusinessDetail />} />
          <Route path="organizations" element={<AdminOrganizations />} />
          <Route path="organizations/:id" element={<AdminOrganizationDetail />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="branding" element={<AdminBranding />} />
          <Route path="feature-flags" element={<AdminFeatureFlags />} />
        </Route>
      )}

      {profile && isPartnerStaff(profile.role) && (
        <Route path="/" element={<PartnerLayout />}>
          <Route index element={<PartnerDashboard />} />
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="businesses" element={<PartnerBusinesses />} />
          <Route path="businesses/:id" element={<PartnerBusinessDetail />} />
          <Route path="billing" element={<PartnerBilling />} />
          <Route path="payments" element={<PartnerPayments />} />
          <Route path="settings" element={<PartnerSettings />} />
        </Route>
      )}

      {profile && profile.role === "BUSINESS_ADMIN" && (
        <Route path="/" element={<BusinessLayout />}>
          <Route index element={<BusinessDashboard />} />
          <Route path="dashboard" element={<BusinessDashboard />} />
          <Route path="my-business" element={<BusinessMyBusiness />} />
          <Route path="questions" element={<BusinessQuestions />} />
          <Route path="reviews" element={<BusinessReviews />} />
          <Route path="settings" element={<BusinessSettings />} />
        </Route>
      )}

      {!profile && <Route path="*" element={<Navigate to="/login" />} />}
      {profile && <Route path="*" element={<Navigate to="/dashboard" />} />}
    </Routes>
  );
}
