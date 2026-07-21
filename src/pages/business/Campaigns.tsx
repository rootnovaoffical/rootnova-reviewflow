import { useEffect, useState, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  campaignTypeMeta,
  campaignStatusMeta,
} from "../../lib/engagement";
import type { Campaign, CampaignType, CampaignStatus } from "../../lib/types";

const campaignTypes: CampaignType[] = ["review", "discount", "festival", "referral", "weekend_offer", "happy_hour", "new_menu"];
const audienceSegments = ["all", "new", "returning", "loyal", "vip", "promoter", "passive", "detractor", "inactive", "needs_followup"];

export default function BusinessCampaigns() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setCampaigns([]); setLoading(false); return; }
      setBusinessId(link.business_id);
      const { data, error } = await fetchCampaigns(link.business_id);
      if (error) throw new Error(error);
      setCampaigns(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (campaign: Campaign, status: CampaignStatus) => {
    const { error } = await updateCampaign(campaign.id, { status });
    if (error) { showToast("Failed to update campaign", "error"); return; }
    setCampaigns((prev) => prev.map((c) => c.id === campaign.id ? { ...c, status } : c));
    showToast(`Campaign ${status}`, "success");
  };

  const handleDelete = async (campaign: Campaign) => {
    const { error } = await deleteCampaign(campaign.id);
    if (error) { showToast("Failed to delete campaign", "error"); return; }
    setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
    showToast("Campaign deleted", "success");
  };

  if (loading) return (
    <BusinessShell title="Campaigns">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard className="!min-h-[60px]" />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Campaigns">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Campaigns">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Campaign Center</h2>
            <p className="text-sm text-slate-400 mt-1">Launch targeted campaigns and track their performance.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowBuilder(true); }}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap"
          >
            + New Campaign
          </button>
        </div>

        {/* Campaigns grid */}
        {campaigns.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="text-4xl mb-3">📣</div>
            <h3 className="text-lg font-semibold text-white mb-2">No campaigns yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Create your first campaign to reach customers with targeted offers, review requests, or special promotions.
            </p>
            <button onClick={() => setShowBuilder(true)} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">
              Create your first campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign, i) => {
              const tm = campaignTypeMeta(campaign.campaign_type);
              const sm = campaignStatusMeta(campaign.status);
              const conversionRate = campaign.reach_count > 0 ? Math.round((campaign.conversion_count / campaign.reach_count) * 100) : 0;
              return (
                <div
                  key={campaign.id}
                  className="glass rounded-2xl p-5 card-hover animate-fade-up border border-white/5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tm.icon}</span>
                      <h3 className="text-white text-sm font-semibold">{campaign.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>{sm.label}</span>
                  </div>

                  {campaign.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{campaign.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Reach</p>
                      <p className="text-sm font-bold text-white">{campaign.reach_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Response</p>
                      <p className="text-sm font-bold text-white">{campaign.response_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Conv.</p>
                      <p className="text-sm font-bold text-success-400">{conversionRate}%</p>
                    </div>
                  </div>

                  {campaign.audience_segment && (
                    <p className="text-xs text-slate-500 mb-3">Audience: <span className="text-slate-300 capitalize">{campaign.audience_segment.replace(/_/g, " ")}</span></p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-600">{timeAgo(campaign.created_at)}</p>
                    <div className="flex gap-2">
                      {campaign.status === "draft" && (
                        <button onClick={() => handleStatusChange(campaign, "active")} className="text-xs text-success-400 hover:text-success-300 transition-colors">Launch</button>
                      )}
                      {campaign.status === "active" && (
                        <button onClick={() => handleStatusChange(campaign, "paused")} className="text-xs text-warning-400 hover:text-warning-300 transition-colors">Pause</button>
                      )}
                      {campaign.status === "paused" && (
                        <button onClick={() => handleStatusChange(campaign, "active")} className="text-xs text-success-400 hover:text-success-300 transition-colors">Resume</button>
                      )}
                      <button onClick={() => { setEditing(campaign); setShowBuilder(true); }} className="text-xs text-slate-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(campaign)} className="text-xs text-error-400 hover:text-error-300 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Builder modal */}
      {showBuilder && businessId && (
        <CampaignBuilder
          businessId={businessId}
          editing={editing}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={() => { setShowBuilder(false); setEditing(null); load(); }}
        />
      )}
    </BusinessShell>
  );
}

function CampaignBuilder({ businessId, editing, onClose, onSaved }: {
  businessId: string;
  editing: Campaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(editing?.name || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [campaignType, setCampaignType] = useState<CampaignType>(editing?.campaign_type || "review");
  const [audienceSegment, setAudienceSegment] = useState(editing?.audience_segment || "all");
  const [scheduleStart, setScheduleStart] = useState(editing?.schedule_start?.slice(0, 16) || "");
  const [scheduleEnd, setScheduleEnd] = useState(editing?.schedule_end?.slice(0, 16) || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Please enter a name", "error"); return; }
    setSaving(true);

    const campaignData = {
      business_id: businessId,
      name: name.trim(),
      description: description.trim() || null,
      campaign_type: campaignType,
      audience_segment: audienceSegment === "all" ? null : audienceSegment,
      status: (editing?.status || "draft") as CampaignStatus,
      schedule_start: scheduleStart ? new Date(scheduleStart).toISOString() : null,
      schedule_end: scheduleEnd ? new Date(scheduleEnd).toISOString() : null,
      metadata: {},
    };

    if (editing) {
      const { error } = await updateCampaign(editing.id, campaignData);
      if (error) { showToast("Failed to update campaign", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "campaign_updated", target_type: "campaign", target_id: editing.id, metadata: { name: campaignData.name } });
      }
      showToast("Campaign updated", "success");
    } else {
      const { error } = await createCampaign(campaignData);
      if (error) { showToast("Failed to create campaign", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "campaign_created", target_type: "business", target_id: businessId, metadata: { name: campaignData.name } });
      }
      showToast("Campaign created", "success");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{editing ? "Edit Campaign" : "New Campaign"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Review Special" className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this campaign about?" className="input-field w-full min-h-[60px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none" />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Campaign Type</label>
            <div className="grid grid-cols-3 gap-2">
              {campaignTypes.map((t) => {
                const tm = campaignTypeMeta(t);
                return (
                  <button key={t} onClick={() => setCampaignType(t)} className={`p-2.5 rounded-xl text-xs font-medium transition-all border ${campaignType === t ? "btn-primary text-white border-primary-500/30" : "bg-slate-900/40 text-slate-300 border-white/5 hover:border-white/10"}`}>
                    {tm.icon} {tm.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Target Audience</label>
            <select value={audienceSegment} onChange={(e) => setAudienceSegment(e.target.value)} className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm">
              {audienceSegments.map((s) => <option key={s} value={s}>{s === "all" ? "All Customers" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Start Date</label>
              <input type="datetime-local" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">End Date</label>
              <input type="datetime-local" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-slate-300 text-sm font-medium rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {saving ? "Saving..." : editing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
