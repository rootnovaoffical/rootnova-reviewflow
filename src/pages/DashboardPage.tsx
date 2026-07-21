import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, MessageSquare, ListChecks, QrCode as QrCodeIcon, Zap, Workflow, FileCode,
  Mail, Users, Brain, Target, Megaphone, FileBarChart, Plug, Code2, CreditCard,
  Building2, Flag, ScrollText, Settings, LogOut, Sparkles, ExternalLink, Copy, ChevronDown, ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import SpatialBackground from "../components/SpatialBackground";
import type { AdminRole } from "../lib/types";

import OverviewModule from "../modules/OverviewModule";
import ReviewsModule from "../modules/ReviewsModule";
import QuestionsModule from "../modules/QuestionsModule";
import QrCodesModule from "../modules/QrCodesModule";
import AutomationModule from "../modules/AutomationModule";
import WorkflowsModule from "../modules/WorkflowsModule";
import WorkflowTemplatesModule from "../modules/WorkflowTemplatesModule";
import { MessagesModule, MessageTemplatesModule, ScheduledMessagesModule } from "../modules/MessagingModule";
import { CustomersModule, LoyaltyModule } from "../modules/CustomersModule";
import AiTasksModule from "../modules/AiTasksModule";
import { AiRecommendationsModule, ActionItemsModule, AiBriefingsModule, AiSimulationsModule } from "../modules/AiInsightsModule";
import CampaignsModule from "../modules/CampaignsModule";
import GoalsModule from "../modules/GoalsModule";
import { ReportTemplatesModule, ScheduledReportsModule } from "../modules/ReportsModule";
import { InstalledIntegrationsModule, IntegrationProvidersModule } from "../modules/IntegrationsModule";
import { ApiKeysModule, DeveloperAppsModule, WebhooksModule } from "../modules/DeveloperModule";
import { PlansModule, SubscriptionsModule, PaymentsModule, InvoicesModule } from "../modules/BillingModule";
import { OrganizationsModule, OrganizationMembersModule, EnterpriseBranchesModule, EnterpriseRegionsModule, OrganizationPoliciesModule } from "../modules/OrganizationsModule";
import { FeatureFlagsModule, AuditLogsModule, UsageRecordsModule } from "../modules/PlatformModule";

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  modules: { key: string; label: string; icon: React.ReactNode; roles: AdminRole[]; render: () => React.ReactNode }[];
}

export default function DashboardPage() {
  const { user, business, organization, role, loading, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState("overview");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["core"]));
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", welcome_message: "", google_place_id: "", public_review_enabled: true, business_category: "", contact_email: "", contact_phone: "", location_city: "" });

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (business) setSettingsForm({ name: business.name, welcome_message: business.welcome_message, google_place_id: business.google_place_id || "", public_review_enabled: business.public_review_enabled, business_category: business.business_category || "", contact_email: business.contact_email || "", contact_phone: business.contact_phone || "", location_city: business.location_city || "" });
  }, [business]);

  if (loading) return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (!user || !business) return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="glass-strong rounded-3xl p-10 text-center"><h1 className="text-2xl font-bold text-white mb-2">No Business Found</h1><p className="text-slate-400">Unable to load dashboard.</p></div></div></>;

  const currentRole = role || "business_admin";
  const allRoles: AdminRole[] = ["super_admin", "partner_admin", "business_admin"];

  const navGroups: NavGroup[] = [
    {
      label: "Core", icon: <Sparkles className="w-4 h-4" />,
      modules: [
        { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" />, roles: allRoles, render: () => <OverviewModule businessId={business.id} businessName={business.name} /> },
        { key: "reviews", label: "Reviews", icon: <MessageSquare className="w-4 h-4" />, roles: allRoles, render: () => <ReviewsModule businessId={business.id} /> },
        { key: "questions", label: "Questions", icon: <ListChecks className="w-4 h-4" />, roles: allRoles, render: () => <QuestionsModule businessId={business.id} /> },
        { key: "qr", label: "QR Codes", icon: <QrCodeIcon className="w-4 h-4" />, roles: allRoles, render: () => <QrCodesModule businessId={business.id} /> },
      ],
    },
    {
      label: "Automation", icon: <Zap className="w-4 h-4" />,
      modules: [
        { key: "automation", label: "Automation Rules", icon: <Zap className="w-4 h-4" />, roles: allRoles, render: () => <AutomationModule businessId={business.id} /> },
        { key: "workflows", label: "Workflows", icon: <Workflow className="w-4 h-4" />, roles: allRoles, render: () => <WorkflowsModule businessId={business.id} /> },
        { key: "workflow_templates", label: "Workflow Templates", icon: <FileCode className="w-4 h-4" />, roles: allRoles, render: () => <WorkflowTemplatesModule /> },
      ],
    },
    {
      label: "Messaging", icon: <Mail className="w-4 h-4" />,
      modules: [
        { key: "messages", label: "Messages", icon: <Mail className="w-4 h-4" />, roles: allRoles, render: () => <MessagesModule businessId={business.id} /> },
        { key: "message_templates", label: "Templates", icon: <FileCode className="w-4 h-4" />, roles: allRoles, render: () => <MessageTemplatesModule businessId={business.id} /> },
        { key: "scheduled_messages", label: "Scheduled", icon: <Mail className="w-4 h-4" />, roles: allRoles, render: () => <ScheduledMessagesModule businessId={business.id} /> },
      ],
    },
    {
      label: "Customers", icon: <Users className="w-4 h-4" />,
      modules: [
        { key: "customers", label: "Customers", icon: <Users className="w-4 h-4" />, roles: allRoles, render: () => <CustomersModule businessId={business.id} /> },
        { key: "loyalty", label: "Loyalty Programs", icon: <Users className="w-4 h-4" />, roles: allRoles, render: () => <LoyaltyModule businessId={business.id} /> },
      ],
    },
    {
      label: "AI Engine", icon: <Brain className="w-4 h-4" />,
      modules: [
        { key: "ai_tasks", label: "AI Tasks", icon: <Brain className="w-4 h-4" />, roles: allRoles, render: () => <AiTasksModule businessId={business.id} /> },
        { key: "ai_recommendations", label: "Recommendations", icon: <Brain className="w-4 h-4" />, roles: allRoles, render: () => <AiRecommendationsModule businessId={business.id} /> },
        { key: "action_items", label: "Action Items", icon: <Target className="w-4 h-4" />, roles: allRoles, render: () => <ActionItemsModule businessId={business.id} /> },
        { key: "ai_briefings", label: "Briefings", icon: <Brain className="w-4 h-4" />, roles: allRoles, render: () => <AiBriefingsModule businessId={business.id} /> },
        { key: "ai_simulations", label: "Simulations", icon: <Brain className="w-4 h-4" />, roles: allRoles, render: () => <AiSimulationsModule businessId={business.id} /> },
      ],
    },
    {
      label: "Growth", icon: <Megaphone className="w-4 h-4" />,
      modules: [
        { key: "campaigns", label: "Campaigns", icon: <Megaphone className="w-4 h-4" />, roles: allRoles, render: () => <CampaignsModule businessId={business.id} /> },
        { key: "goals", label: "Business Goals", icon: <Target className="w-4 h-4" />, roles: allRoles, render: () => <GoalsModule businessId={business.id} /> },
      ],
    },
    {
      label: "Reports", icon: <FileBarChart className="w-4 h-4" />,
      modules: [
        { key: "report_templates", label: "Report Templates", icon: <FileBarChart className="w-4 h-4" />, roles: allRoles, render: () => <ReportTemplatesModule businessId={business.id} /> },
        { key: "scheduled_reports", label: "Scheduled Reports", icon: <FileBarChart className="w-4 h-4" />, roles: allRoles, render: () => <ScheduledReportsModule businessId={business.id} /> },
      ],
    },
    {
      label: "Integrations", icon: <Plug className="w-4 h-4" />,
      modules: [
        { key: "installed_integrations", label: "Installed", icon: <Plug className="w-4 h-4" />, roles: allRoles, render: () => <InstalledIntegrationsModule businessId={business.id} /> },
        { key: "integration_providers", label: "Providers", icon: <Plug className="w-4 h-4" />, roles: allRoles, render: () => <IntegrationProvidersModule /> },
      ],
    },
    {
      label: "Developer", icon: <Code2 className="w-4 h-4" />,
      modules: [
        { key: "api_keys", label: "API Keys", icon: <Code2 className="w-4 h-4" />, roles: allRoles, render: () => <ApiKeysModule businessId={business.id} /> },
        { key: "developer_apps", label: "Developer Apps", icon: <Code2 className="w-4 h-4" />, roles: allRoles, render: () => <DeveloperAppsModule businessId={business.id} /> },
        { key: "webhooks", label: "Webhooks", icon: <Code2 className="w-4 h-4" />, roles: allRoles, render: () => <WebhooksModule businessId={business.id} /> },
      ],
    },
    {
      label: "Billing", icon: <CreditCard className="w-4 h-4" />,
      modules: [
        { key: "plans", label: "Plans", icon: <CreditCard className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <PlansModule /> },
        { key: "subscriptions", label: "Subscriptions", icon: <CreditCard className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <SubscriptionsModule organizationId={organization?.id || business.id} /> },
        { key: "payments", label: "Payments", icon: <CreditCard className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <PaymentsModule organizationId={organization?.id || business.id} /> },
        { key: "invoices", label: "Invoices", icon: <CreditCard className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <InvoicesModule organizationId={organization?.id || business.id} /> },
      ],
    },
    {
      label: "Organization", icon: <Building2 className="w-4 h-4" />,
      modules: [
        { key: "organizations", label: "Organizations", icon: <Building2 className="w-4 h-4" />, roles: ["super_admin"], render: () => <OrganizationsModule /> },
        { key: "org_members", label: "Members", icon: <Users className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <OrganizationMembersModule organizationId={organization?.id || business.id} /> },
        { key: "branches", label: "Branches", icon: <Building2 className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <EnterpriseBranchesModule organizationId={organization?.id || business.id} /> },
        { key: "regions", label: "Regions", icon: <Building2 className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <EnterpriseRegionsModule organizationId={organization?.id || business.id} /> },
        { key: "policies", label: "Policies", icon: <Building2 className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <OrganizationPoliciesModule organizationId={organization?.id || business.id} /> },
      ],
    },
    {
      label: "Platform", icon: <Flag className="w-4 h-4" />,
      modules: [
        { key: "feature_flags", label: "Feature Flags", icon: <Flag className="w-4 h-4" />, roles: ["super_admin"], render: () => <FeatureFlagsModule /> },
        { key: "audit_logs", label: "Audit Logs", icon: <ScrollText className="w-4 h-4" />, roles: ["super_admin"], render: () => <AuditLogsModule /> },
        { key: "usage_records", label: "Usage Records", icon: <BarChart3 className="w-4 h-4" />, roles: ["super_admin", "partner_admin"], render: () => <UsageRecordsModule organizationId={organization?.id || business.id} /> },
      ],
    },
    {
      label: "Settings", icon: <Settings className="w-4 h-4" />,
      modules: [
        { key: "settings", label: "Business Settings", icon: <Settings className="w-4 h-4" />, roles: allRoles, render: () => null },
      ],
    },
  ];

  const toggleGroup = (label: string) => setExpandedGroups(prev => { const n = new Set(prev); if (n.has(label)) n.delete(label); else n.add(label); return n; });
  const copyReviewLink = () => { navigator.clipboard.writeText(`${window.location.origin}/#/review/${business.slug}`); showToast("Review link copied!", "success"); };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase.from("businesses").update({ name: settingsForm.name, welcome_message: settingsForm.welcome_message, google_place_id: settingsForm.google_place_id || null, public_review_enabled: settingsForm.public_review_enabled, business_category: settingsForm.business_category || null, contact_email: settingsForm.contact_email || null, contact_phone: settingsForm.contact_phone || null, location_city: settingsForm.location_city || null }).eq("id", business.id);
      if (error) throw error;
      showToast("Settings saved!", "success"); setEditingSettings(false);
    } catch { showToast("Failed to save settings", "error"); }
  };

  const renderActiveModule = () => {
    if (activeModule === "settings") {
      return (
        <div className="space-y-6 screen-enter">
          <div><h1 className="text-xl font-bold text-white">Business Settings</h1><p className="text-sm text-slate-400">Configure your review flow and business profile</p></div>
          <div className="glass-card rounded-2xl p-6 space-y-4">
            {[
              { label: "Business Name", key: "name", type: "text" },
              { label: "Welcome Message", key: "welcome_message", type: "textarea" },
              { label: "Google Place ID", key: "google_place_id", type: "text" },
              { label: "Business Category", key: "business_category", type: "text" },
              { label: "Contact Email", key: "contact_email", type: "text" },
              { label: "Contact Phone", key: "contact_phone", type: "text" },
              { label: "Location City", key: "location_city", type: "text" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-300 mb-2">{f.label}</label>
                {f.type === "textarea" ? <textarea value={settingsForm[f.key as keyof typeof settingsForm] as string} onChange={(e) => setSettingsForm({ ...settingsForm, [f.key]: e.target.value })} disabled={!editingSettings} rows={2} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60 resize-none" /> : <input type="text" value={settingsForm[f.key as keyof typeof settingsForm] as string} onChange={(e) => setSettingsForm({ ...settingsForm, [f.key]: e.target.value })} disabled={!editingSettings} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60" />}
              </div>
            ))}
            <div className="flex items-center gap-3"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={settingsForm.public_review_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, public_review_enabled: e.target.checked })} disabled={!editingSettings} className="w-5 h-5 rounded accent-primary-500" /><span className="text-sm text-slate-300">Public review flow enabled</span></label></div>
            <div className="flex gap-3 pt-2">
              {editingSettings ? (<><button onClick={handleSaveSettings} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all">Save</button><button onClick={() => { setEditingSettings(false); if (business) setSettingsForm({ name: business.name, welcome_message: business.welcome_message, google_place_id: business.google_place_id || "", public_review_enabled: business.public_review_enabled, business_category: business.business_category || "", contact_email: business.contact_email || "", contact_phone: business.contact_phone || "", location_city: business.location_city || "" }); }} className="px-6 py-2.5 rounded-xl glass text-slate-300 text-sm font-medium hover:bg-white/5">Cancel</button></>) : (<button onClick={() => setEditingSettings(true)} className="px-6 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/5 transition-all">Edit Settings</button>)}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><QrCodeIcon className="w-5 h-5 text-primary-400" /> Review Link</h3>
            <div className="flex items-center gap-3"><code className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-primary-300 text-sm truncate">{window.location.origin}/#/review/{business.slug}</code><button onClick={copyReviewLink} className="px-4 py-3 rounded-xl glass text-white hover:bg-white/10 transition-all"><Copy className="w-4 h-4" /></button></div>
            <a href={`#/review/${business.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"><ExternalLink className="w-4 h-4" /> Open public review page</a>
          </div>
        </div>
      );
    }
    for (const group of navGroups) for (const mod of group.modules) if (mod.key === activeModule && mod.roles.includes(currentRole)) return mod.render();
    return <div className="text-center py-20 text-slate-500">Module not available for your role.</div>;
  };

  const roleLabel = currentRole === "super_admin" ? "Super Admin" : currentRole === "partner_admin" ? "Partner Admin" : "Business Admin";

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex">
        <aside className="w-64 hidden lg:flex flex-col glass-strong border-r border-white/10 min-h-screen p-3 sticky top-0 overflow-y-auto" style={{ maxHeight: "100vh" }}>
          <div className="flex items-center gap-3 mb-6 px-2">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>}
            <div className="min-w-0"><h2 className="text-sm font-bold text-white truncate">{business.name}</h2><p className="text-xs text-slate-500">{roleLabel}</p></div>
          </div>
          <nav className="space-y-1 flex-1">
            {navGroups.map(group => {
              const visibleMods = group.modules.filter(m => m.roles.includes(currentRole));
              if (visibleMods.length === 0) return null;
              const expanded = expandedGroups.has(group.label);
              return (
                <div key={group.label}>
                  <button onClick={() => toggleGroup(group.label)} className="sidebar-link w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {group.icon} <span className="flex-1 text-left">{group.label}</span>
                    {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {expanded && visibleMods.map(mod => (
                    <button key={mod.key} onClick={() => setActiveModule(mod.key)} className={`sidebar-link w-full flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm font-medium ${activeModule === mod.key ? "sidebar-link-active text-white" : "text-slate-400"}`}>{mod.icon} {mod.label}</button>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="pt-3 border-t border-white/5 space-y-1">
            <button onClick={copyReviewLink} className="sidebar-link w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white"><QrCodeIcon className="w-4 h-4" /> Copy Review Link</button>
            <a href={`#/review/${business.slug}`} className="sidebar-link w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white"><ExternalLink className="w-4 h-4" /> Public Page</a>
            <button onClick={() => { signOut(); navigate("/"); }} className="sidebar-link w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-error-400"><LogOut className="w-4 h-4" /> Sign Out</button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="lg:hidden mb-4 flex items-center gap-3">
            {business.logo_url && <img src={business.logo_url} alt={business.name} className="w-8 h-8 rounded-lg object-cover" />}
            <select value={activeModule} onChange={(e) => setActiveModule(e.target.value)} className="flex-1 px-3 py-2 rounded-lg glass border border-white/10 text-white text-sm">
              {navGroups.map(g => g.modules.filter(m => m.roles.includes(currentRole)).map(m => <option key={m.key} value={m.key}>{g.label} / {m.label}</option>))}
            </select>
            <button onClick={() => { signOut(); navigate("/"); }} className="p-2 rounded-lg glass text-slate-400"><LogOut className="w-4 h-4" /></button>
          </div>
          {renderActiveModule()}
        </main>
      </div>
    </>
  );
}
