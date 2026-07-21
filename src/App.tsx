import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { ToastProvider } from "./context/ToastContext";
import { MobileProvider } from "./context/MobileContext";
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
import AdminInvoices from "./pages/admin/Invoices";
import AdminUsage from "./pages/admin/Usage";
import AdminCustomerSuccess from "./pages/admin/CustomerSuccess";
import AdminMonitoring from "./pages/admin/Monitoring";
import AdminDeploymentReadiness from "./pages/admin/DeploymentReadiness";
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
import BusinessOnboarding from "./pages/business/Onboarding";
import BusinessMyBusiness from "./pages/business/MyBusiness";
import BusinessQuestions from "./pages/business/Questions";
import BusinessReviews from "./pages/business/Reviews";
import BusinessAnalytics from "./pages/business/Analytics";
import BusinessSettings from "./pages/business/Settings";
import BusinessQRCodes from "./pages/business/QRCodes";
import BusinessActions from "./pages/business/Actions";
import BusinessEngagement from "./pages/business/Engagement";
import BusinessCustomers from "./pages/business/Customers";
import BusinessCustomer360 from "./pages/business/Customer360";
import BusinessAutomations from "./pages/business/Automations";
import BusinessCampaigns from "./pages/business/Campaigns";
import BusinessLoyalty from "./pages/business/Loyalty";
import BusinessCommunicationHub from "./pages/business/CommunicationHub";
import BusinessCommunicationTemplates from "./pages/business/CommunicationTemplates";
import BusinessCommunicationAnalytics from "./pages/business/CommunicationAnalytics";
import BusinessWorkflows from "./pages/business/Workflows";
import BusinessWorkflowEditor from "./pages/business/WorkflowEditor";
import BusinessWorkflowTemplates from "./pages/business/WorkflowTemplates";
import BusinessWorkflowAnalytics from "./pages/business/WorkflowAnalytics";

import AICommandCenter from "./pages/business/AICommandCenter";
import AITaskCenter from "./pages/business/AITaskCenter";
import AIGoals from "./pages/business/AIGoals";
import AIBriefings from "./pages/business/AIBriefings";
import AISimulations from "./pages/business/AISimulations";

import BusinessIntegrations from "./pages/business/Integrations";
import IntegrationMarketplace from "./pages/business/IntegrationMarketplace";
import IntegrationDeveloper from "./pages/business/IntegrationDeveloper";
import IntegrationWebhooks from "./pages/business/IntegrationWebhooks";

import EnterpriseDashboard from "./pages/business/EnterpriseDashboard";
import EnterpriseRegions from "./pages/business/EnterpriseRegions";
import EnterpriseBranches from "./pages/business/EnterpriseBranches";
import EnterpriseComparison from "./pages/business/EnterpriseComparison";
import EnterprisePolicies from "./pages/business/EnterprisePolicies";
import EnterpriseRoles from "./pages/business/EnterpriseRoles";
import EnterpriseEvents from "./pages/business/EnterpriseEvents";
import EnterpriseBranchManagers from "./pages/business/EnterpriseBranchManagers";

import BusinessReports from "./pages/business/Reports";
import BusinessReportBuilder from "./pages/business/ReportBuilder";
import BusinessScheduledReports from "./pages/business/ScheduledReports";

import MobileDashboard from "./pages/mobile/Dashboard";
import MobileReviews from "./pages/mobile/Reviews";
import MobileAIAssistant from "./pages/mobile/AIAssistant";
import MobileNotifications from "./pages/mobile/Notifications";
import MobileMore from "./pages/mobile/More";
import MobileAnalytics from "./pages/mobile/Analytics";
import MobileCustomer360 from "./pages/mobile/Customer360";
import MobileCampaigns from "./pages/mobile/Campaigns";
import MobileCommunication from "./pages/mobile/Communication";
import MobileQR from "./pages/mobile/QR";
import MobileWorkflows from "./pages/mobile/Workflows";
import MobileEnterprise from "./pages/mobile/Enterprise";
import MobileSettings from "./pages/mobile/Settings";
import MobileProfile from "./pages/mobile/Profile";
import MobileLoyalty from "./pages/mobile/Loyalty";

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
            <MobileProvider>
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
                <Route path="/admin/invoices" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminInvoices /></ProtectedRoute>} />
                <Route path="/admin/usage" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminUsage /></ProtectedRoute>} />
                <Route path="/admin/customer-success" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminCustomerSuccess /></ProtectedRoute>} />
                <Route path="/admin/monitoring" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminMonitoring /></ProtectedRoute>} />
                <Route path="/admin/deployment" element={<ProtectedRoute roles={[...ADMIN_ROLES]}><AdminDeploymentReadiness /></ProtectedRoute>} />
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
                <Route path="/business/onboarding" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessOnboarding /></ProtectedRoute>} />
                <Route path="/business/my-business" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessMyBusiness /></ProtectedRoute>} />
                <Route path="/business/questions" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessQuestions /></ProtectedRoute>} />
                <Route path="/business/reviews" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessReviews /></ProtectedRoute>} />
                <Route path="/business/analytics" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessAnalytics /></ProtectedRoute>} />
                <Route path="/business/settings" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessSettings /></ProtectedRoute>} />
                <Route path="/business/qr-codes" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessQRCodes /></ProtectedRoute>} />
                <Route path="/business/actions" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessActions /></ProtectedRoute>} />
                <Route path="/business/engagement" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessEngagement /></ProtectedRoute>} />
                <Route path="/business/engagement/customers" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessCustomers /></ProtectedRoute>} />
                <Route path="/business/customer-360" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessCustomer360 /></ProtectedRoute>} />
                <Route path="/business/engagement/automations" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessAutomations /></ProtectedRoute>} />
                <Route path="/business/engagement/campaigns" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessCampaigns /></ProtectedRoute>} />
                <Route path="/business/engagement/loyalty" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessLoyalty /></ProtectedRoute>} />
                <Route path="/business/communication" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessCommunicationHub /></ProtectedRoute>} />
                <Route path="/business/communication/templates" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessCommunicationTemplates /></ProtectedRoute>} />
                <Route path="/business/communication/analytics" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessCommunicationAnalytics /></ProtectedRoute>} />
                <Route path="/business/workflows" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessWorkflows /></ProtectedRoute>} />
                <Route path="/business/workflows/templates" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessWorkflowTemplates /></ProtectedRoute>} />
                <Route path="/business/workflows/analytics" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessWorkflowAnalytics /></ProtectedRoute>} />
                <Route path="/business/workflows/:id" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessWorkflowEditor /></ProtectedRoute>} />
                <Route path="/business/workflows/new" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessWorkflowEditor /></ProtectedRoute>} />

                <Route path="/business/ai-command" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><AICommandCenter /></ProtectedRoute>} />
                <Route path="/business/ai-tasks" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><AITaskCenter /></ProtectedRoute>} />
                <Route path="/business/ai-goals" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><AIGoals /></ProtectedRoute>} />
                <Route path="/business/ai-briefings" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><AIBriefings /></ProtectedRoute>} />
                <Route path="/business/ai-simulations" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><AISimulations /></ProtectedRoute>} />

                <Route path="/business/integrations" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessIntegrations /></ProtectedRoute>} />
                <Route path="/business/integrations/marketplace" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><IntegrationMarketplace /></ProtectedRoute>} />
                <Route path="/business/integrations/developer" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><IntegrationDeveloper /></ProtectedRoute>} />
                <Route path="/business/integrations/webhooks" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><IntegrationWebhooks /></ProtectedRoute>} />

                <Route path="/business/enterprise" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseDashboard /></ProtectedRoute>} />
                <Route path="/business/enterprise/regions" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseRegions /></ProtectedRoute>} />
                <Route path="/business/enterprise/branches" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseBranches /></ProtectedRoute>} />
                <Route path="/business/enterprise/comparison" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseComparison /></ProtectedRoute>} />
                <Route path="/business/enterprise/policies" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterprisePolicies /></ProtectedRoute>} />
                <Route path="/business/enterprise/roles" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseRoles /></ProtectedRoute>} />
                <Route path="/business/enterprise/events" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseEvents /></ProtectedRoute>} />
                <Route path="/business/enterprise/managers" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><EnterpriseBranchManagers /></ProtectedRoute>} />

                <Route path="/business/reports" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessReports /></ProtectedRoute>} />
                <Route path="/business/reports/builder" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessReportBuilder /></ProtectedRoute>} />
                <Route path="/business/reports/scheduled" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><BusinessScheduledReports /></ProtectedRoute>} />

                <Route path="/mobile" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileDashboard /></ProtectedRoute>} />
                <Route path="/mobile/reviews" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileReviews /></ProtectedRoute>} />
                <Route path="/mobile/ai" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileAIAssistant /></ProtectedRoute>} />
                <Route path="/mobile/notifications" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileNotifications /></ProtectedRoute>} />
                <Route path="/mobile/more" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileMore /></ProtectedRoute>} />
                <Route path="/mobile/analytics" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileAnalytics /></ProtectedRoute>} />
                <Route path="/mobile/customer-360" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileCustomer360 /></ProtectedRoute>} />
                <Route path="/mobile/campaigns" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileCampaigns /></ProtectedRoute>} />
                <Route path="/mobile/communication" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileCommunication /></ProtectedRoute>} />
                <Route path="/mobile/qr" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileQR /></ProtectedRoute>} />
                <Route path="/mobile/workflows" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileWorkflows /></ProtectedRoute>} />
                <Route path="/mobile/enterprise" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileEnterprise /></ProtectedRoute>} />
                <Route path="/mobile/settings" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileSettings /></ProtectedRoute>} />
                <Route path="/mobile/profile" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileProfile /></ProtectedRoute>} />
                <Route path="/mobile/loyalty" element={<ProtectedRoute roles={[...BUSINESS_ROLES]}><MobileLoyalty /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            </MobileProvider>
          </AuthProvider>
        </BrandingProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
