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
  fetchAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  triggerTypeMeta,
  actionTypeMeta,
} from "../../lib/engagement";
import type { AutomationRule, AutomationTriggerType, AutomationActionType, AutomationStatus } from "../../lib/types";

const triggerTypes: AutomationTriggerType[] = ["review_submitted", "rating_threshold", "customer_segment", "campaign_response"];
const actionTypes: AutomationActionType[] = ["send_message", "notify_manager", "open_recovery", "add_points", "send_coupon"];

export default function BusinessAutomations() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);

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
      if (!link?.business_id) { setRules([]); setLoading(false); return; }
      setBusinessId(link.business_id);
      const { data, error } = await fetchAutomationRules(link.business_id);
      if (error) throw new Error(error);
      setRules(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (rule: AutomationRule) => {
    const newStatus: AutomationStatus = rule.status === "active" ? "paused" : "active";
    const { error } = await updateAutomationRule(rule.id, { status: newStatus });
    if (error) { showToast("Failed to update automation", "error"); return; }
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, status: newStatus } : r));
    showToast(`Automation ${newStatus === "active" ? "activated" : "paused"}`, "success");
  };

  const handleDelete = async (rule: AutomationRule) => {
    const { error } = await deleteAutomationRule(rule.id);
    if (error) { showToast("Failed to delete automation", "error"); return; }
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    showToast("Automation deleted", "success");
  };

  if (loading) return (
    <BusinessShell title="Automations">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard className="!min-h-[60px]" />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Automations">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Automations">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Follow-up Automations</h2>
            <p className="text-sm text-slate-400 mt-1">Automate your customer follow-ups based on real behavior.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowBuilder(true); }}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap"
          >
            + New Automation
          </button>
        </div>

        {/* Rules list */}
        {rules.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="text-lg font-semibold text-white mb-2">No automations yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Create your first automation to automatically follow up with customers based on their reviews and behavior.
            </p>
            <button onClick={() => setShowBuilder(true)} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">
              Create your first automation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule, i) => {
              const tm = triggerTypeMeta(rule.trigger_type as AutomationTriggerType);
              const am = actionTypeMeta(rule.action_type as AutomationActionType);
              const isActive = rule.status === "active";
              return (
                <div
                  key={rule.id}
                  className={`glass rounded-2xl p-5 card-hover animate-fade-up border ${isActive ? "border-success-500/20" : "border-white/5"}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isActive ? "🟢" : "⏸️"}</span>
                      <h3 className="text-white text-sm font-semibold">{rule.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-success-500/15 text-success-400" : "bg-slate-600/15 text-slate-400"}`}>
                      {isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{tm.icon}</span>
                      <span>When: <span className="text-slate-300">{tm.label}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{am.icon}</span>
                      <span>Then: <span className="text-slate-300">{am.label}</span></span>
                    </div>
                    {(rule.delay_hours || 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>⏱️</span>
                        <span>Wait: <span className="text-slate-300">{rule.delay_hours}h</span></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-600">
                      {rule.trigger_count > 0 ? `${rule.trigger_count} triggers` : "Never triggered"}
                      {rule.last_triggered_at && ` · ${timeAgo(rule.last_triggered_at)}`}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleStatus(rule)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        {isActive ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => { setEditing(rule); setShowBuilder(true); }} className="text-xs text-slate-400 hover:text-white transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(rule)} className="text-xs text-error-400 hover:text-error-300 transition-colors">
                        Delete
                      </button>
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
        <AutomationBuilder
          businessId={businessId}
          editing={editing}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={() => { setShowBuilder(false); setEditing(null); load(); }}
        />
      )}
    </BusinessShell>
  );
}

function AutomationBuilder({ businessId, editing, onClose, onSaved }: {
  businessId: string;
  editing: AutomationRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(editing?.name || "");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>((editing?.trigger_type as AutomationTriggerType) || "review_submitted");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(editing?.trigger_config || {});
  const [actionType, setActionType] = useState<AutomationActionType>((editing?.action_type as AutomationActionType) || "send_message");
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>(editing?.action_config || {});
  const [delayHours, setDelayHours] = useState(editing?.delay_hours || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Please enter a name", "error"); return; }
    setSaving(true);

    const ruleData = {
      business_id: businessId,
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      delay_hours: delayHours,
      status: "active" as AutomationStatus,
    };

    if (editing) {
      const { error } = await updateAutomationRule(editing.id, ruleData);
      if (error) { showToast("Failed to update automation", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "automation_rule_updated", target_type: "automation_rule", target_id: editing.id, metadata: { name: ruleData.name } });
      }
      showToast("Automation updated", "success");
    } else {
      const { error } = await createAutomationRule(ruleData);
      if (error) { showToast("Failed to create automation", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "automation_rule_created", target_type: "business", target_id: businessId, metadata: { name: ruleData.name } });
      }
      showToast("Automation created", "success");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{editing ? "Edit Automation" : "New Automation"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thank 5-star reviewers"
              className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">When (Trigger)</label>
            <div className="grid grid-cols-2 gap-2">
              {triggerTypes.map((t) => {
                const tm = triggerTypeMeta(t);
                return (
                  <button
                    key={t}
                    onClick={() => { setTriggerType(t); setTriggerConfig({}); }}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border ${triggerType === t ? "btn-primary text-white border-primary-500/30" : "bg-slate-900/40 text-slate-300 border-white/5 hover:border-white/10"}`}
                  >
                    {tm.icon} {tm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger config */}
          {triggerType === "rating_threshold" && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Rating Condition</label>
              <div className="flex gap-2">
                <select
                  value={(triggerConfig.condition as string) || "equals"}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, condition: e.target.value })}
                  className="input-field p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
                >
                  <option value="equals">Equals</option>
                  <option value="less_than">Less than</option>
                  <option value="greater_than">Greater than</option>
                  <option value="less_equal">Less or equal</option>
                  <option value="greater_equal">Greater or equal</option>
                </select>
                <select
                  value={(triggerConfig.rating as number) || 5}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, rating: parseInt(e.target.value) })}
                  className="input-field p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
                >
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ⭐</option>)}
                </select>
              </div>
            </div>
          )}

          {triggerType === "customer_segment" && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Target Segment</label>
              <select
                value={(triggerConfig.segment as string) || "detractor"}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, segment: e.target.value })}
                className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
              >
                <option value="detractor">Detractor</option>
                <option value="promoter">Promoter</option>
                <option value="loyal">Loyal</option>
                <option value="vip">VIP</option>
                <option value="inactive">Inactive</option>
                <option value="needs_followup">Needs Follow-up</option>
              </select>
            </div>
          )}

          {/* Action */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Then (Action)</label>
            <div className="grid grid-cols-2 gap-2">
              {actionTypes.map((a) => {
                const am = actionTypeMeta(a);
                return (
                  <button
                    key={a}
                    onClick={() => { setActionType(a); setActionConfig({}); }}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border ${actionType === a ? "btn-primary text-white border-primary-500/30" : "bg-slate-900/40 text-slate-300 border-white/5 hover:border-white/10"}`}
                  >
                    {am.icon} {am.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action config */}
          {(actionType === "send_message" || actionType === "send_coupon" || actionType === "open_recovery") && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Message Template</label>
              <textarea
                value={(actionConfig.message_template as string) || ""}
                onChange={(e) => setActionConfig({ ...actionConfig, message_template: e.target.value })}
                placeholder="Write a warm, human message..."
                className="input-field w-full min-h-[80px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Delay */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Wait before sending (hours)</label>
            <input
              type="number"
              min={0}
              max={168}
              value={delayHours}
              onChange={(e) => setDelayHours(parseInt(e.target.value) || 0)}
              className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
            />
          </div>
        </div>

        {/* Actions */}
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
