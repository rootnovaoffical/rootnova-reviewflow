import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import SpatialBackground from '../components/SpatialBackground';
import type { AdminRole } from '../lib/types';
import {
  LayoutDashboard, Star, HelpCircle, QrCode as QrCodeIcon, Zap, Workflow, FileStack,
  MessageSquare, Users, Brain, TrendingUp, FileBarChart, Plug, Code2, CreditCard,
  Building2, Globe, Settings, LogOut, ChevronDown, ChevronRight, Menu, Copy,
  ExternalLink, Save
} from 'lucide-react';

import OverviewModule from '../modules/OverviewModule';
import ReviewsModule from '../modules/ReviewsModule';
import QuestionsModule from '../modules/QuestionsModule';
import QrCodesModule from '../modules/QrCodesModule';
import AutomationModule from '../modules/AutomationModule';
import WorkflowsModule from '../modules/WorkflowsModule';
import WorkflowTemplatesModule from '../modules/WorkflowTemplatesModule';
import { MessagesModule, MessageTemplatesModule, ScheduledMessagesModule } from '../modules/MessagingModule';
import { CustomersModule, LoyaltyModule } from '../modules/CustomersModule';
import AiTasksModule from '../modules/AiTasksModule';
import { AiRecommendationsModule, ActionItemsModule, AiBriefingsModule, AiSimulationsModule } from '../modules/AiInsightsModule';
import CampaignsModule from '../modules/CampaignsModule';
import GoalsModule from '../modules/GoalsModule';
import { ReportTemplatesModule, ScheduledReportsModule } from '../modules/ReportsModule';
import { InstalledIntegrationsModule, IntegrationProvidersModule } from '../modules/IntegrationsModule';
import { ApiKeysModule, DeveloperAppsModule, WebhooksModule } from '../modules/DeveloperModule';
import { PlansModule, SubscriptionsModule, PaymentsModule, InvoicesModule } from '../modules/BillingModule';
import { OrganizationsModule, OrganizationMembersModule, EnterpriseBranchesModule, EnterpriseRegionsModule, OrganizationPoliciesModule } from '../modules/OrganizationsModule';
import { FeatureFlagsModule, AuditLogsModule, UsageRecordsModule } from '../modules/PlatformModule';

interface ModuleDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AdminRole[];
  render: (businessId: string, organizationId?: string) => React.ReactNode;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  modules: ModuleDef[];
}

const ALL_ROLES: AdminRole[] = ['super_admin', 'partner_admin', 'business_admin'];
const SUPER_PARTNER: AdminRole[] = ['super_admin', 'partner_admin'];
const SUPER_ONLY: AdminRole[] = ['super_admin'];

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'core', label: 'Core', icon: LayoutDashboard,
    modules: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ALL_ROLES, render: (bid) => <OverviewModule businessId={bid} /> },
      { id: 'reviews', label: 'Reviews', icon: Star, roles: ALL_ROLES, render: (bid) => <ReviewsModule businessId={bid} /> },
      { id: 'questions', label: 'Questions', icon: HelpCircle, roles: ALL_ROLES, render: (bid) => <QuestionsModule businessId={bid} /> },
      { id: 'qrcodes', label: 'QR Codes', icon: QrCodeIcon, roles: ALL_ROLES, render: (bid) => <QrCodesModule businessId={bid} /> },
    ],
  },
  {
    id: 'automation', label: 'Automation', icon: Zap,
    modules: [
      { id: 'automation_rules', label: 'Automation Rules', icon: Zap, roles: ALL_ROLES, render: (bid) => <AutomationModule businessId={bid} /> },
      { id: 'workflows', label: 'Workflows', icon: Workflow, roles: ALL_ROLES, render: (bid) => <WorkflowsModule businessId={bid} /> },
      { id: 'workflow_templates', label: 'Workflow Templates', icon: FileStack, roles: ALL_ROLES, render: (bid) => <WorkflowTemplatesModule businessId={bid} /> },
    ],
  },
  {
    id: 'messaging', label: 'Messaging', icon: MessageSquare,
    modules: [
      { id: 'messages', label: 'Messages', icon: MessageSquare, roles: ALL_ROLES, render: (bid) => <MessagesModule businessId={bid} /> },
      { id: 'message_templates', label: 'Templates', icon: FileStack, roles: ALL_ROLES, render: (bid) => <MessageTemplatesModule businessId={bid} /> },
      { id: 'scheduled_messages', label: 'Scheduled', icon: TrendingUp, roles: ALL_ROLES, render: (bid) => <ScheduledMessagesModule businessId={bid} /> },
    ],
  },
  {
    id: 'customers', label: 'Customers', icon: Users,
    modules: [
      { id: 'customers', label: 'Customers', icon: Users, roles: ALL_ROLES, render: (bid) => <CustomersModule businessId={bid} /> },
      { id: 'loyalty', label: 'Loyalty Programs', icon: Star, roles: ALL_ROLES, render: (bid) => <LoyaltyModule businessId={bid} /> },
    ],
  },
  {
    id: 'ai', label: 'AI Engine', icon: Brain,
    modules: [
      { id: 'ai_tasks', label: 'AI Tasks', icon: Brain, roles: ALL_ROLES, render: (bid) => <AiTasksModule businessId={bid} /> },
      { id: 'ai_recommendations', label: 'Recommendations', icon: TrendingUp, roles: ALL_ROLES, render: (bid) => <AiRecommendationsModule businessId={bid} /> },
      { id: 'action_items', label: 'Action Items', icon: Star, roles: ALL_ROLES, render: (bid) => <ActionItemsModule businessId={bid} /> },
      { id: 'ai_briefings', label: 'Briefings', icon: FileStack, roles: ALL_ROLES, render: (bid) => <AiBriefingsModule businessId={bid} /> },
      { id: 'ai_simulations', label: 'Simulations', icon: Brain, roles: ALL_ROLES, render: (bid) => <AiSimulationsModule businessId={bid} /> },
    ],
  },
  {
    id: 'growth', label: 'Growth', icon: TrendingUp,
    modules: [
      { id: 'campaigns', label: 'Campaigns', icon: TrendingUp, roles: ALL_ROLES, render: (bid) => <CampaignsModule businessId={bid} /> },
      { id: 'goals', label: 'Business Goals', icon: Star, roles: ALL_ROLES, render: (bid) => <GoalsModule businessId={bid} /> },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: FileBarChart,
    modules: [
      { id: 'report_templates', label: 'Report Templates', icon: FileStack, roles: ALL_ROLES, render: (bid) => <ReportTemplatesModule businessId={bid} /> },
      { id: 'scheduled_reports', label: 'Scheduled Reports', icon: FileBarChart, roles: ALL_ROLES, render: (bid) => <ScheduledReportsModule businessId={bid} /> },
    ],
  },
  {
    id: 'integrations', label: 'Integrations', icon: Plug,
    modules: [
      { id: 'installed_integrations', label: 'Installed', icon: Plug, roles: ALL_ROLES, render: (bid) => <InstalledIntegrationsModule businessId={bid} /> },
      { id: 'integration_providers', label: 'Providers', icon: Globe, roles: ALL_ROLES, render: (bid) => <IntegrationProvidersModule businessId={bid} /> },
    ],
  },
  {
    id: 'developer', label: 'Developer', icon: Code2,
    modules: [
      { id: 'api_keys', label: 'API Keys', icon: Code2, roles: ALL_ROLES, render: (bid) => <ApiKeysModule businessId={bid} /> },
      { id: 'developer_apps', label: 'Developer Apps', icon: Code2, roles: ALL_ROLES, render: (bid) => <DeveloperAppsModule businessId={bid} /> },
      { id: 'webhooks', label: 'Webhooks', icon: Plug, roles: ALL_ROLES, render: (bid) => <WebhooksModule businessId={bid} /> },
    ],
  },
  {
    id: 'billing', label: 'Billing', icon: CreditCard,
    modules: [
      { id: 'plans', label: 'Plans', icon: CreditCard, roles: SUPER_PARTNER, render: (bid) => <PlansModule businessId={bid} /> },
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, roles: SUPER_PARTNER, render: (bid) => <SubscriptionsModule businessId={bid} /> },
      { id: 'payments', label: 'Payments', icon: CreditCard, roles: SUPER_PARTNER, render: (bid) => <PaymentsModule businessId={bid} /> },
      { id: 'invoices', label: 'Invoices', icon: FileStack, roles: SUPER_PARTNER, render: (bid) => <InvoicesModule businessId={bid} /> },
    ],
  },
  {
    id: 'organization', label: 'Organization', icon: Building2,
    modules: [
      { id: 'organizations', label: 'Organizations', icon: Building2, roles: SUPER_PARTNER, render: (_bid, oid) => <OrganizationsModule organizationId={oid || ''} /> },
      { id: 'org_members', label: 'Members', icon: Users, roles: SUPER_PARTNER, render: (_bid, oid) => <OrganizationMembersModule organizationId={oid || ''} /> },
      { id: 'branches', label: 'Branches', icon: Building2, roles: SUPER_PARTNER, render: (_bid, oid) => <EnterpriseBranchesModule organizationId={oid || ''} /> },
      { id: 'regions', label: 'Regions', icon: Globe, roles: SUPER_PARTNER, render: (_bid, oid) => <EnterpriseRegionsModule organizationId={oid || ''} /> },
      { id: 'org_policies', label: 'Policies', icon: FileStack, roles: SUPER_PARTNER, render: (_bid, oid) => <OrganizationPoliciesModule organizationId={oid || ''} /> },
    ],
  },
  {
    id: 'platform', label: 'Platform', icon: Globe,
    modules: [
      { id: 'feature_flags', label: 'Feature Flags', icon: Star, roles: SUPER_ONLY, render: (bid) => <FeatureFlagsModule businessId={bid} /> },
      { id: 'audit_logs', label: 'Audit Logs', icon: FileStack, roles: SUPER_ONLY, render: (bid) => <AuditLogsModule businessId={bid} /> },
      { id: 'usage_records', label: 'Usage Records', icon: TrendingUp, roles: SUPER_ONLY, render: (bid) => <UsageRecordsModule businessId={bid} /> },
    ],
  },
];

export default function DashboardPage() {
  const { user, business, organization, role, signOut } = useAuth();
  const { showToast } = useToast();
  const [activeModule, setActiveModule] = useState('overview');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState(false);
  const [editName, setEditName] = useState(business?.name || '');
  const [editCategory, setEditCategory] = useState(business?.business_category || '');
  const [editPhone, setEditPhone] = useState(business?.contact_phone || '');
  const [editEmail, setEditEmail] = useState(business?.contact_email || '');
  const [editCity, setEditCity] = useState(business?.location_city || '');
  const [editGoogleUrl, setEditGoogleUrl] = useState(business?.google_review_url || '');
  const [editWelcome, setEditWelcome] = useState(business?.welcome_message || '');

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function copyReviewLink() {
    if (!business) return;
    navigator.clipboard.writeText(`${window.location.origin}/#/review/${business.slug}`);
    showToast('success', 'Review link copied!');
  }

  async function saveSettings() {
    if (!business) return;
    try {
      const { error } = await supabase.from('businesses').update({
        name: editName, business_category: editCategory, contact_phone: editPhone,
        contact_email: editEmail, location_city: editCity,
        google_review_url: editGoogleUrl, welcome_message: editWelcome,
      }).eq('id', business.id);
      if (error) throw error;
      showToast('success', 'Settings saved');
      setSettingsMode(false);
    } catch (e) { showToast('error', `Save failed: ${(e as Error).message}`); }
  }

  let activeModuleDef: ModuleDef | null = null;
  for (const group of NAV_GROUPS) {
    const found = group.modules.find((m) => m.id === activeModule);
    if (found) { activeModuleDef = found; break; }
  }

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'partner_admin' ? 'Partner Admin' : 'Business Admin';

  function renderSidebar() {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 flex items-center justify-center">
              <span className="text-blue-400 font-bold text-sm">R</span>
            </div>
            <span className="text-white font-semibold">RootNova</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => {
            const visibleModules = group.modules.filter((m) => m.roles.includes(role));
            if (visibleModules.length === 0) return null;
            const collapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id} className="mb-1">
                <button onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-200 transition-colors">
                  {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <group.icon className="w-3.5 h-3.5" />
                  {group.label}
                </button>
                {!collapsed && (
                  <div className="space-y-0.5">
                    {visibleModules.map((m) => (
                      <button key={m.id} onClick={() => { setActiveModule(m.id); setSettingsMode(false); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-8 py-2 text-sm transition-colors ${
                          activeModule === m.id && !settingsMode
                            ? 'bg-blue-500/10 text-blue-300 border-l-2 border-blue-400'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                        }`}>
                        <m.icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <button onClick={() => setSettingsMode(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              settingsMode ? 'bg-blue-500/10 text-blue-300' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}>
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex">
      <SpatialBackground />
      <aside className="relative z-10 w-64 shrink-0 bg-black/40 backdrop-blur-xl border-r border-white/10 hidden lg:block">
        {renderSidebar()}
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-950 border-r border-white/10" onClick={(e) => e.stopPropagation()}>
            {renderSidebar()}
          </aside>
        </div>
      )}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 bg-black/30 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-zinc-400">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-white">{settingsMode ? 'Settings' : activeModuleDef?.label || 'Dashboard'}</h1>
              <p className="text-xs text-zinc-500">{business?.name || 'No business'} · {roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyReviewLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:bg-white/10 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
            {business?.slug && (
              <a href={`#/review/${business.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:bg-white/10 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View Page
              </a>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {settingsMode ? (
            <div className="max-w-2xl space-y-5">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Business Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
                    <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Phone</label>
                    <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Email</label>
                    <input type="text" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">City</label>
                    <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Review URL</label>
                    <input type="text" value={editGoogleUrl} onChange={(e) => setEditGoogleUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Welcome Message</label>
                    <textarea value={editWelcome} onChange={(e) => setEditWelcome(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50" />
                  </div>
                </div>
                <div className="flex justify-end mt-5">
                  <button onClick={saveSettings} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 text-sm font-medium transition-colors">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Email</span><span className="text-white">{user?.email}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Role</span><span className="text-blue-300">{roleLabel}</span></div>
                  {organization && <div className="flex justify-between"><span className="text-zinc-400">Organization</span><span className="text-white">{organization.name}</span></div>}
                </div>
              </div>
            </div>
          ) : activeModuleDef && business ? (
            activeModuleDef.render(business.id, organization?.id)
          ) : (
            <div className="text-center py-20 text-zinc-500">
              <p className="mb-2">No business linked to your account.</p>
              <p className="text-xs">Contact your administrator to get access.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
