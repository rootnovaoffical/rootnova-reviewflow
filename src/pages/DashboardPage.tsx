import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Star, HelpCircle, QrCode, Zap, Workflow, FileStack,
  Mail, FileText, Users, Gift, Target, Brain, Sparkles, BarChart3,
  Plug, Code2, Key, Webhook, CreditCard, Building2, Network, Shield,
  LogOut, ChevronDown, Menu, Bell, Settings,
} from 'lucide-react';

import OverviewModule from '../modules/OverviewModule';
import ReviewsModule from '../modules/ReviewsModule';
import QuestionsModule from '../modules/QuestionsModule';
import QrCodesModule from '../modules/QrCodesModule';
import BusinessSettingsModule from '../modules/BusinessSettingsModule';
import AutomationModule from '../modules/AutomationModule';
import WorkflowsModule from '../modules/WorkflowsModule';
import WorkflowTemplatesModule from '../modules/WorkflowTemplatesModule';
import { MessagesModule, MessageTemplatesModule, ScheduledMessagesModule } from '../modules/MessagingModule';
import { CustomersModule, LoyaltyModule } from '../modules/CustomersModule';
import { GoalsModule } from '../modules/GoalsModule';
import { CampaignsModule } from '../modules/CampaignsModule';
import { AiTasksModule } from '../modules/AiTasksModule';
import { AiRecommendationsModule, ActionItemsModule, AiBriefingsModule, AiSimulationsModule } from '../modules/AiInsightsModule';
import { ReportTemplatesModule, ScheduledReportsModule } from '../modules/ReportsModule';
import { InstalledIntegrationsModule, IntegrationProvidersModule } from '../modules/IntegrationsModule';
import { ApiKeysModule, DeveloperAppsModule, WebhooksModule } from '../modules/DeveloperModule';
import { PlansModule, SubscriptionsModule, PaymentsModule, InvoicesModule } from '../modules/BillingModule';
import { OrganizationsModule, OrganizationMembersModule, EnterpriseBranchesModule, EnterpriseRegionsModule, OrganizationPoliciesModule } from '../modules/OrganizationsModule';
import { FeatureFlagsModule, AuditLogsModule, UsageRecordsModule } from '../modules/PlatformModule';

type IconType = typeof Star;

interface NavItem { id: string; label: string; icon: IconType; }
interface NavGroup {
  id: string;
  label: string;
  icon: IconType;
  items: NavItem[];
  roles?: string[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'core', label: 'Core', icon: LayoutDashboard,
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'reviews', label: 'Reviews', icon: Star },
      { id: 'questions', label: 'Questions', icon: HelpCircle },
      { id: 'qr_codes', label: 'QR Codes', icon: QrCode },
      { id: 'business_settings', label: 'Business Settings', icon: Settings },
    ],
  },
  {
    id: 'automation', label: 'Automation', icon: Zap,
    items: [
      { id: 'automation_rules', label: 'Rules', icon: Zap },
      { id: 'workflows', label: 'Workflows', icon: Workflow },
      { id: 'workflow_templates', label: 'Templates', icon: FileStack },
    ],
  },
  {
    id: 'messaging', label: 'Messaging', icon: Mail,
    items: [
      { id: 'messages', label: 'Messages', icon: Mail },
      { id: 'message_templates', label: 'Templates', icon: FileText },
      { id: 'scheduled_messages', label: 'Scheduled', icon: Bell },
    ],
  },
  {
    id: 'customers', label: 'Customers', icon: Users,
    items: [
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'loyalty', label: 'Loyalty', icon: Gift },
    ],
  },
  {
    id: 'growth', label: 'Growth', icon: Target,
    items: [
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'campaigns', label: 'Campaigns', icon: BarChart3 },
    ],
  },
  {
    id: 'ai', label: 'AI Engine', icon: Brain,
    items: [
      { id: 'ai_tasks', label: 'AI Tasks', icon: Brain },
      { id: 'ai_recommendations', label: 'Recommendations', icon: Sparkles },
      { id: 'action_items', label: 'Action Items', icon: Zap },
      { id: 'ai_briefings', label: 'Briefings', icon: FileText },
      { id: 'ai_simulations', label: 'Simulations', icon: BarChart3 },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: FileText,
    items: [
      { id: 'report_templates', label: 'Templates', icon: FileText },
      { id: 'scheduled_reports', label: 'Scheduled', icon: Bell },
    ],
  },
  {
    id: 'integrations', label: 'Integrations', icon: Plug,
    items: [
      { id: 'installed_integrations', label: 'Installed', icon: Plug },
      { id: 'integration_providers', label: 'Providers', icon: Plug },
    ],
  },
  {
    id: 'developer', label: 'Developer', icon: Code2,
    roles: ['ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN', 'PARTNER_OWNER', 'PARTNER_ADMIN'],
    items: [
      { id: 'api_keys', label: 'API Keys', icon: Key },
      { id: 'developer_apps', label: 'Apps', icon: Code2 },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    ],
  },
  {
    id: 'billing', label: 'Billing', icon: CreditCard,
    roles: ['ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN', 'PARTNER_OWNER', 'PARTNER_ADMIN'],
    items: [
      { id: 'plans', label: 'Plans', icon: CreditCard },
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'invoices', label: 'Invoices', icon: FileText },
    ],
  },
  {
    id: 'enterprise', label: 'Enterprise', icon: Building2,
    roles: ['ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN', 'PARTNER_OWNER', 'PARTNER_ADMIN'],
    items: [
      { id: 'organizations', label: 'Organizations', icon: Building2 },
      { id: 'organization_members', label: 'Members', icon: Users },
      { id: 'enterprise_branches', label: 'Branches', icon: Network },
      { id: 'enterprise_regions', label: 'Regions', icon: Network },
      { id: 'organization_policies', label: 'Policies', icon: Shield },
    ],
  },
  {
    id: 'platform', label: 'Platform', icon: Shield,
    roles: ['ROOTNOVA_SUPER_ADMIN'],
    items: [
      { id: 'feature_flags', label: 'Feature Flags', icon: Shield },
      { id: 'audit_logs', label: 'Audit Logs', icon: Shield },
      { id: 'usage_records', label: 'Usage', icon: BarChart3 },
    ],
  },
];

export default function DashboardPage() {
  const { user, business, businesses, organization, role, signOut, switchBusiness } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bizDropdown, setBizDropdown] = useState(false);

  const visibleGroups = useMemo(
    () => NAV_GROUPS.filter((g) => !g.roles || g.roles.includes(role)),
    [role]
  );

  const orgId = organization?.id ?? '';

  function renderModule() {
    if (!business) {
      return <div className="text-center py-16 text-zinc-500">No business available. Contact your administrator.</div>;
    }
    const bid = business.id;

    switch (activeView) {
      case 'overview': return <OverviewModule businessId={bid} />;
      case 'reviews': return <ReviewsModule businessId={bid} />;
      case 'questions': return <QuestionsModule businessId={bid} />;
      case 'qr_codes': return <QrCodesModule businessId={bid} />;
      case 'business_settings': return <BusinessSettingsModule businessId={bid} />;
      case 'automation_rules': return <AutomationModule businessId={bid} />;
      case 'workflows': return <WorkflowsModule businessId={bid} />;
      case 'workflow_templates': return <WorkflowTemplatesModule businessId={bid} />;
      case 'messages': return <MessagesModule businessId={bid} />;
      case 'message_templates': return <MessageTemplatesModule businessId={bid} />;
      case 'scheduled_messages': return <ScheduledMessagesModule businessId={bid} />;
      case 'customers': return <CustomersModule businessId={bid} />;
      case 'loyalty': return <LoyaltyModule businessId={bid} />;
      case 'goals': return <GoalsModule businessId={bid} />;
      case 'campaigns': return <CampaignsModule businessId={bid} />;
      case 'ai_tasks': return <AiTasksModule businessId={bid} />;
      case 'ai_recommendations': return <AiRecommendationsModule businessId={bid} />;
      case 'action_items': return <ActionItemsModule businessId={bid} />;
      case 'ai_briefings': return <AiBriefingsModule businessId={bid} />;
      case 'ai_simulations': return <AiSimulationsModule businessId={bid} />;
      case 'report_templates': return <ReportTemplatesModule businessId={bid} />;
      case 'scheduled_reports': return <ScheduledReportsModule businessId={bid} />;
      case 'installed_integrations': return <InstalledIntegrationsModule businessId={bid} />;
      case 'integration_providers': return <IntegrationProvidersModule />;
      case 'api_keys': return <ApiKeysModule businessId={bid} />;
      case 'developer_apps': return <DeveloperAppsModule businessId={bid} />;
      case 'webhooks': return <WebhooksModule businessId={bid} />;
      case 'plans': return <PlansModule />;
      case 'subscriptions': return orgId ? <SubscriptionsModule organizationId={orgId} /> : <NoOrg />;
      case 'payments': return orgId ? <PaymentsModule organizationId={orgId} /> : <NoOrg />;
      case 'invoices': return orgId ? <InvoicesModule organizationId={orgId} /> : <NoOrg />;
      case 'organizations': return <OrganizationsModule organizationId={orgId} />;
      case 'organization_members': return orgId ? <OrganizationMembersModule organizationId={orgId} /> : <NoOrg />;
      case 'enterprise_branches': return orgId ? <EnterpriseBranchesModule organizationId={orgId} /> : <NoOrg />;
      case 'enterprise_regions': return orgId ? <EnterpriseRegionsModule organizationId={orgId} /> : <NoOrg />;
      case 'organization_policies': return orgId ? <OrganizationPoliciesModule organizationId={orgId} /> : <NoOrg />;
      case 'feature_flags': return <FeatureFlagsModule businessId={bid} />;
      case 'audit_logs': return orgId ? <AuditLogsModule organizationId={orgId} /> : <NoOrg />;
      case 'usage_records': return orgId ? <UsageRecordsModule organizationId={orgId} /> : <NoOrg />;
      default: return <OverviewModule businessId={bid} />;
    }
  }

  const activeLabel = useMemo(() => {
    for (const g of visibleGroups) {
      const item = g.items.find((i) => i.id === activeView);
      if (item) return item.label;
    }
    return 'Overview';
  }, [visibleGroups, activeView]);

  return (
    <div className="min-h-screen relative">
      <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-zinc-950/95 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">RootNova</span>
        </div>
        <nav className="overflow-y-auto h-[calc(100%-4rem)] py-4 px-3 space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.id}>
              <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <group.icon className="w-3 h-3" /> {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeView === item.id ? 'bg-blue-500/20 text-blue-200 border border-blue-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-zinc-400">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-white">{activeLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            {businesses.length > 0 && (
              <div className="relative">
                <button onClick={() => setBizDropdown(!bizDropdown)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 hover:bg-white/10 transition-colors">
                  {business?.logo_url ? <img src={business.logo_url} alt="" className="w-5 h-5 rounded" /> : <Building2 className="w-4 h-4 text-zinc-400" />}
                  <span className="max-w-[140px] truncate">{business?.name ?? 'Select'}</span>
                  <span className="text-xs text-zinc-500 capitalize hidden sm:inline">· {role.replace(/_/g, ' ').toLowerCase()}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                {bizDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBizDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-20 py-1.5">
                      {businesses.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => { switchBusiness(b.id); setBizDropdown(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors ${b.id === business?.id ? 'text-blue-300' : 'text-zinc-300'}`}
                        >
                          {b.logo_url ? <img src={b.logo_url} alt="" className="w-5 h-5 rounded" /> : <Building2 className="w-4 h-4 text-zinc-500" />}
                          <span className="truncate">{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                {(user?.email ?? '?')[0].toUpperCase()}
              </div>
              <span className="text-sm text-zinc-300 max-w-[120px] truncate">{user?.email}</span>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-red-400 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

function NoOrg() {
  return <div className="text-center py-16 text-zinc-500">This module requires an organization. Select a business that belongs to an organization.</div>;
}
