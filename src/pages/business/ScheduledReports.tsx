import { useEffect, useState, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  fetchScheduledReports,
  createScheduledReport,
  deleteScheduledReport,
  fetchReportTemplates,
  fetchReportDeliveries,
  frequencyMeta,
  deliveryChannelMeta,
} from "../../lib/reporting";
import { formatNextRun, pauseScheduledReport, resumeScheduledReport, getSchedulerStatus, frequencyOptions } from "../../lib/report-scheduler";
import { LoadingSpinner, EmptyState, PageHeader } from "../../components/ui";
import type { ScheduledReport, ReportTemplate, ReportDelivery, ReportFrequency, DeliveryChannel } from "../../lib/types";

export default function ScheduledReportsPage() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [deliveries, setDeliveries] = useState<ReportDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ total: 0, active: 0, overdue: 0, nextRun: null as string | null });

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [frequency, setFrequency] = useState<ReportFrequency>("monthly");
  const [customCron, setCustomCron] = useState("");
  const [deliveryChannels, setDeliveryChannels] = useState<DeliveryChannel[]>(["email"]);
  const [deliveryEmails, setDeliveryEmails] = useState("");
  const [deliveryPhones, setDeliveryPhones] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (data?.business_id) setBusinessId(data.business_id);
        else setLoading(false);
      });
  }, [profile]);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    const [scheds, tmpls, delivs, st] = await Promise.all([
      fetchScheduledReports(businessId),
      fetchReportTemplates(businessId),
      fetchReportDeliveries(businessId),
      getSchedulerStatus(businessId),
    ]);
    setSchedules(scheds);
    setTemplates(tmpls);
    setDeliveries(delivs);
    setStatus(st);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleChannel = (ch: DeliveryChannel) => {
    setDeliveryChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const handleCreate = async () => {
    if (!businessId || !profile || !name.trim()) return;
    setSaving(true);
    await createScheduledReport({
      business_id: businessId,
      user_id: profile.id,
      template_id: templateId || null,
      name: name.trim(),
      frequency,
      custom_cron: customCron || null,
      delivery_channels: deliveryChannels,
      delivery_emails: deliveryEmails ? deliveryEmails.split(",").map((e) => e.trim()) : [],
      delivery_phones: deliveryPhones ? deliveryPhones.split(",").map((p) => p.trim()) : [],
      next_run_at: null,
      last_run_at: null,
      is_active: true,
      retry_count: 0,
      max_retries: 3,
    });
    setName(""); setTemplateId(""); setFrequency("monthly"); setCustomCron(""); setDeliveryChannels(["email"]); setDeliveryEmails(""); setDeliveryPhones("");
    setShowForm(false);
    await loadData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!businessId || !confirm("Delete this scheduled report?")) return;
    await deleteScheduledReport(id, businessId);
    await loadData();
  };

  const handlePause = async (id: string) => {
    await pauseScheduledReport(id);
    await loadData();
  };

  const handleResume = async (id: string, freq: ReportFrequency, cron: string | null) => {
    await resumeScheduledReport(id, freq, cron);
    await loadData();
  };

  if (loading) return <BusinessShell title="Scheduled Reports"><div className="p-8"><LoadingSpinner /></div></BusinessShell>;

  return (
    <BusinessShell title="Scheduled Reports">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        <PageHeader
          title="Scheduled Reports"
          subtitle="Automate report generation and delivery"
          action={
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? "Cancel" : "New Schedule"}
            </button>
          }
        />

        {/* Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500">Total Schedules</p>
            <p className="text-2xl font-bold text-white">{status.total}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-2xl font-bold text-green-400">{status.active}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="text-2xl font-bold text-red-400">{status.overdue}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500">Next Run</p>
            <p className="text-sm font-medium text-white">{status.nextRun ? formatNextRun(status.nextRun) : "—"}</p>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 animate-fade-up">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Create Scheduled Report</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly Executive Report" className="input-field w-full" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Template (optional)</label>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input-field w-full">
                  <option value="">Default Executive</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as ReportFrequency)} className="input-field w-full">
                  {frequencyOptions.map((f) => <option key={f.value} value={f.value}>{f.label} — {f.description}</option>)}
                </select>
              </div>
              {frequency === "custom" && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Cron Expression</label>
                  <input value={customCron} onChange={(e) => setCustomCron(e.target.value)} placeholder="0 9 * * 1" className="input-field w-full" />
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-2">Delivery Channels</label>
              <div className="flex gap-2">
                {(["email", "whatsapp", "download"] as DeliveryChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      deliveryChannels.includes(ch) ? "bg-primary-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {deliveryChannelMeta[ch].icon} {deliveryChannelMeta[ch].label}
                  </button>
                ))}
              </div>
            </div>
            {deliveryChannels.includes("email") && (
              <div className="mb-4">
                <label className="block text-xs text-slate-500 mb-1">Email Recipients (comma-separated)</label>
                <input value={deliveryEmails} onChange={(e) => setDeliveryEmails(e.target.value)} placeholder="owner@business.com, manager@business.com" className="input-field w-full" />
              </div>
            )}
            {deliveryChannels.includes("whatsapp") && (
              <div className="mb-4">
                <label className="block text-xs text-slate-500 mb-1">WhatsApp Numbers (comma-separated)</label>
                <input value={deliveryPhones} onChange={(e) => setDeliveryPhones(e.target.value)} placeholder="+1234567890, +0987654321" className="input-field w-full" />
              </div>
            )}
            <button onClick={handleCreate} disabled={saving || !name.trim()} className="btn-primary disabled:opacity-40">
              {saving ? "Creating..." : "Create Schedule"}
            </button>
          </div>
        )}

        {/* Schedules List */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Active Schedules</h3>
          {schedules.length === 0 ? (
            <EmptyState message="No scheduled reports yet. Create one to automate report delivery." />
          ) : (
            <div className="space-y-2">
              {schedules.map((sched) => (
                <div key={sched.id} className="flex items-center justify-between bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${sched.is_active ? "bg-green-400" : "bg-slate-600"}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{sched.name}</p>
                      <p className="text-xs text-slate-500">
                        {frequencyMeta[sched.frequency]?.label ?? sched.frequency} · Next: {formatNextRun(sched.next_run_at)} ·
                        Last: {sched.last_run_at ? new Date(sched.last_run_at).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {sched.delivery_channels.map((ch) => (
                        <span key={ch} className="text-xs text-slate-500">{deliveryChannelMeta[ch].icon}</span>
                      ))}
                    </div>
                    {sched.is_active ? (
                      <button onClick={() => handlePause(sched.id)} className="btn-secondary text-xs">Pause</button>
                    ) : (
                      <button onClick={() => handleResume(sched.id, sched.frequency, sched.custom_cron)} className="btn-secondary text-xs">Resume</button>
                    )}
                    <button onClick={() => handleDelete(sched.id)} className="text-red-400 hover:text-red-300 text-xs px-2">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery History */}
        {deliveries.length > 0 && (
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Deliveries</h3>
            <div className="space-y-2">
              {deliveries.slice(0, 10).map((del) => (
                <div key={del.id} className="flex items-center justify-between bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{deliveryChannelMeta[del.channel]?.icon ?? "📨"}</span>
                    <div>
                      <p className="text-sm text-white">{del.recipient ?? "—"}</p>
                      <p className="text-xs text-slate-500">{new Date(del.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    del.status === "sent" ? "bg-green-100 text-green-700" :
                    del.status === "failed" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{del.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
