import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Question, FlowType } from "../../lib/types";
import { SkeletonList } from "../../components/Skeleton";
import { EmptyState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { insertAuditLog } from "../../lib/auth";

export default function BusinessQuestions() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).single()
      .then(({ data }) => {
        if (!data?.business_id) { setQuestions([]); return; }
        setBusinessId(data.business_id);
        supabase.from("questions").select("*").eq("business_id", data.business_id).order("sort_order").then(({ data: q }) => setQuestions(q as Question[] || []));
      });
  };
  useEffect(() => { load(); }, [profile]);

  const save = async (q: Partial<Question> & { id?: string }) => {
    if (!businessId || !profile) return;
    const { id, ...rest } = q;
    if (id) {
      const { error } = await supabase.from("questions").update(rest).eq("id", id);
      if (error) { showToast("Failed to update question", "error"); return; }
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "question_updated", target_type: "question", target_id: id });
      showToast("Question updated", "success");
    } else {
      const { error } = await supabase.from("questions").insert({ ...rest, business_id: businessId });
      if (error) { showToast("Failed to create question", "error"); return; }
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "question_created", target_type: "question" });
      showToast("Question created", "success");
    }
    setEditing(null); setCreating(false); load();
  };

  const remove = async (q: Question) => {
    const { error } = await supabase.from("questions").delete().eq("id", q.id);
    if (error) { showToast("Failed to delete question", "error"); return; }
    if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "question_deleted", target_type: "question", target_id: q.id });
    showToast("Question deleted", "success"); load();
  };

  const reorder = async (q: Question, dir: -1 | 1) => {
    if (!questions) return;
    const idx = questions.findIndex((x) => x.id === q.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const swap = questions[newIdx];
    await Promise.all([
      supabase.from("questions").update({ sort_order: swap.sort_order }).eq("id", q.id),
      supabase.from("questions").update({ sort_order: q.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  if (!questions) return <BusinessShell title="Questions"><div className="p-4 md:p-8"><SkeletonList items={3} /></div></BusinessShell>;

  return (
    <BusinessShell title="Questions">
      <div className="page-enter">
        <div className="flex justify-end mb-4">
          <button onClick={() => setCreating(true)} className="btn-primary">New Question</button>
        </div>
        {questions.length === 0 ? <EmptyState title="No questions" subtitle="Create questions to collect feedback from customers." /> : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="glass rounded-2xl p-5 flex items-center gap-4 card-hover animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex flex-col gap-1">
                  <button onClick={() => reorder(q, -1)} disabled={i === 0} className="text-slate-400 hover:text-white disabled:opacity-30 text-xs">{"\u25B2"}</button>
                  <button onClick={() => reorder(q, 1)} disabled={i === questions.length - 1} className="text-slate-400 hover:text-white disabled:opacity-30 text-xs">{"\u25BC"}</button>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{q.question_text}{q.is_required && <span className="text-error-400 ml-1">*</span>}</p>
                  <p className="text-xs text-slate-500">{q.flow_type} • {q.question_type} • {q.options.length} options • {q.is_active ? "Active" : "Inactive"}</p>
                </div>
                <button onClick={() => setEditing(q)} className="btn-ghost px-3 py-2 text-sm">Edit</button>
                <button onClick={() => remove(q)} className="px-3 py-2 text-sm text-error-400 hover:bg-error-500/10 rounded-lg transition-colors">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {(editing || creating) && <QuestionModal question={editing} onClose={() => { setEditing(null); setCreating(false); }} onSave={save} />}
    </BusinessShell>
  );
}

function QuestionModal({ question, onClose, onSave }: { question: Question | null; onClose: () => void; onSave: (q: Partial<Question> & { id?: string }) => void }) {
  const [form, setForm] = useState({
    question_text: question?.question_text || "", flow_type: question?.flow_type || "POSITIVE", question_type: "multiple_choice",
    options: (question?.options || []).join("\n"), is_required: question?.is_required ?? true, is_active: question?.is_active ?? true,
    sort_order: question?.sort_order ?? 0,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">{question ? "Edit Question" : "New Question"}</h2>
        <div className="space-y-3">
          <div><label className="block text-xs text-slate-400 mb-1">Question Text</label><input value={form.question_text} onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))} className="input-field w-full" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Flow Type</label><select value={form.flow_type} onChange={(e) => setForm((f) => ({ ...f, flow_type: e.target.value as FlowType }))} className="input-field w-full"><option value="POSITIVE">Positive</option><option value="NEUTRAL">Neutral</option><option value="NEGATIVE">Negative</option><option value="ALL">All</option></select></div>
          <div><label className="block text-xs text-slate-400 mb-1">Options (one per line)</label><textarea value={form.options} onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))} className="input-field w-full" rows={4} /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm((f) => ({ ...f, is_required: e.target.checked }))} /> Required</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => onSave({ ...form, options: form.options.split("\n").filter(Boolean), id: question?.id })} className="btn-primary flex-1">Save</button>
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}
