import { useEffect, useState, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchLoyaltyPrograms,
  createLoyaltyProgram,
  updateLoyaltyProgram,
  deleteLoyaltyProgram,
  fetchCustomerLoyalty,
  programTypeMeta,
} from "../../lib/engagement";
import type { LoyaltyProgram, CustomerLoyalty, LoyaltyProgramType } from "../../lib/types";

const programTypes: LoyaltyProgramType[] = ["visit_based", "review_based", "birthday", "festival"];

export default function BusinessLoyalty() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<LoyaltyProgram | null>(null);

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
      if (!link?.business_id) { setPrograms([]); setLoading(false); return; }
      setBusinessId(link.business_id);
      const [progRes, loyaltyRes] = await Promise.all([
        fetchLoyaltyPrograms(link.business_id),
        fetchCustomerLoyalty(link.business_id),
      ]);
      if (progRes.error) throw new Error(progRes.error);
      if (loyaltyRes.error) throw new Error(loyaltyRes.error);
      setPrograms(progRes.data || []);
      setLoyalty(loyaltyRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load loyalty programs");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (program: LoyaltyProgram) => {
    const newStatus = program.status === "active" ? "paused" : "active";
    const { error } = await updateLoyaltyProgram(program.id, { status: newStatus });
    if (error) { showToast("Failed to update program", "error"); return; }
    setPrograms((prev) => prev.map((p) => p.id === program.id ? { ...p, status: newStatus } : p));
    showToast(`Program ${newStatus === "active" ? "activated" : "paused"}`, "success");
  };

  const handleDelete = async (program: LoyaltyProgram) => {
    const { error } = await deleteLoyaltyProgram(program.id);
    if (error) { showToast("Failed to delete program", "error"); return; }
    setPrograms((prev) => prev.filter((p) => p.id !== program.id));
    showToast("Program deleted", "success");
  };

  const totalRedeemed = programs.reduce((s, p) => s + p.redeemed_count, 0);
  const totalUnlocked = loyalty.filter((l) => l.reward_unlocked).length;

  if (loading) return (
    <BusinessShell title="Loyalty">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard className="!min-h-[60px]" />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Loyalty">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Loyalty">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Loyalty Engine</h2>
            <p className="text-sm text-slate-400 mt-1">Reward your customers for coming back.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowBuilder(true); }}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap"
          >
            + New Program
          </button>
        </div>

        {/* Stats */}
        {programs.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Programs</p>
              <p className="text-3xl font-bold text-white mt-1.5">{programs.filter((p) => p.status === "active").length}</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Rewards Redeemed</p>
              <p className="text-3xl font-bold text-success-400 mt-1.5">{totalRedeemed}</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Rewards Unlocked</p>
              <p className="text-3xl font-bold text-warning-400 mt-1.5">{totalUnlocked}</p>
            </div>
          </div>
        )}

        {/* Programs */}
        {programs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="text-4xl mb-3">💎</div>
            <h3 className="text-lg font-semibold text-white mb-2">No loyalty programs yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Create a loyalty program to reward customers for repeat visits, reviews, birthdays, or special occasions.
            </p>
            <button onClick={() => setShowBuilder(true)} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">
              Create your first program
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program, i) => {
              const pm = programTypeMeta(program.program_type as LoyaltyProgramType);
              const isActive = program.status === "active";
              return (
                <div
                  key={program.id}
                  className={`glass rounded-2xl p-5 card-hover animate-fade-up border ${isActive ? "border-warning-500/20" : "border-white/5"}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{pm.icon}</span>
                      <h3 className="text-white text-sm font-semibold">{program.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-success-500/15 text-success-400" : "bg-slate-600/15 text-slate-400"}`}>
                      {isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>🎯</span>
                      <span>Type: <span className="text-slate-300">{pm.label}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>🔢</span>
                      <span>Target: <span className="text-slate-300">{program.target_count} {program.program_type === "visit_based" ? "visits" : "actions"}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>🎁</span>
                      <span>Reward: <span className="text-slate-300">{program.reward_description}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-600">
                      {program.redeemed_count > 0 ? `${program.redeemed_count} redeemed` : "No redemptions yet"}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleStatus(program)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        {isActive ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => { setEditing(program); setShowBuilder(true); }} className="text-xs text-slate-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(program)} className="text-xs text-error-400 hover:text-error-300 transition-colors">Delete</button>
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
        <LoyaltyBuilder
          businessId={businessId}
          editing={editing}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={() => { setShowBuilder(false); setEditing(null); load(); }}
        />
      )}
    </BusinessShell>
  );
}

function LoyaltyBuilder({ businessId, editing, onClose, onSaved }: {
  businessId: string;
  editing: LoyaltyProgram | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(editing?.name || "");
  const [programType, setProgramType] = useState<LoyaltyProgramType>((editing?.program_type as LoyaltyProgramType) || "visit_based");
  const [targetCount, setTargetCount] = useState(editing?.target_count || 5);
  const [rewardDescription, setRewardDescription] = useState(editing?.reward_description || "");
  const [pointsPerAction, setPointsPerAction] = useState(editing?.points_per_action || 1);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Please enter a name", "error"); return; }
    if (!rewardDescription.trim()) { showToast("Please enter a reward description", "error"); return; }
    setSaving(true);

    const programData = {
      business_id: businessId,
      name: name.trim(),
      program_type: programType,
      target_count: targetCount,
      reward_description: rewardDescription.trim(),
      points_per_action: pointsPerAction,
      status: editing?.status || "active",
    };

    if (editing) {
      const { error } = await updateLoyaltyProgram(editing.id, programData);
      if (error) { showToast("Failed to update program", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "loyalty_program_updated", target_type: "loyalty_program", target_id: editing.id, metadata: { name: programData.name } });
      }
      showToast("Program updated", "success");
    } else {
      const { error } = await createLoyaltyProgram(programData);
      if (error) { showToast("Failed to create program", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "loyalty_program_created", target_type: "business", target_id: businessId, metadata: { name: programData.name } });
      }
      showToast("Program created", "success");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{editing ? "Edit Program" : "New Loyalty Program"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Program Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Visit 5 Times Get Free Coffee" className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Program Type</label>
            <div className="grid grid-cols-2 gap-2">
              {programTypes.map((t) => {
                const pm = programTypeMeta(t);
                return (
                  <button key={t} onClick={() => setProgramType(t)} className={`p-3 rounded-xl text-sm font-medium transition-all border ${programType === t ? "btn-primary text-white border-primary-500/30" : "bg-slate-900/40 text-slate-300 border-white/5 hover:border-white/10"}`}>
                    {pm.icon} {pm.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Target Count</label>
              <input type="number" min={1} max={100} value={targetCount} onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)} className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Points Per Action</label>
              <input type="number" min={1} max={100} value={pointsPerAction} onChange={(e) => setPointsPerAction(parseInt(e.target.value) || 1)} className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Reward Description</label>
            <textarea value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} placeholder="e.g. Free coffee on your next visit" className="input-field w-full min-h-[60px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none" />
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
