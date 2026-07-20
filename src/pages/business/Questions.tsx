import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, PageHeader } from "../../components/ui";
import type { Question } from "../../lib/types";

const FLOW_TYPES = ["ALWAYS", "POSITIVE", "NEGATIVE"] as const;

export default function Questions() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    question_text: "",
    flow_type: "ALWAYS" as string,
    optionsText: "",
    is_required: true,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!profile) return;
    loadQuestions();
  }, [profile]);

  async function loadQuestions() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const { data: baData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    const bizId = baData?.business_id;
    if (!bizId) {
      setError("No business assigned to your account.");
      setLoading(false);
      return;
    }
    setBusinessId(bizId);

    const { data, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("business_id", bizId)
      .order("sort_order", { ascending: true });

    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }
    setQuestions((data ?? []) as Question[]);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      question_text: "",
      flow_type: "ALWAYS",
      optionsText: "",
      is_required: true,
      is_active: true,
      sort_order: questions.length,
    });
    setEditingId(null);
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      flow_type: q.flow_type,
      optionsText: q.options?.join(", ") ?? "",
      is_required: q.is_required,
      is_active: q.is_active,
      sort_order: q.sort_order,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    setError(null);

    const options = form.optionsText
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    const payload = {
      business_id: businessId,
      question_text: form.question_text,
      question_type: "multiple_choice",
      flow_type: form.flow_type,
      options,
      is_required: form.is_required,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    if (editingId) {
      const { error: uError } = await supabase
        .from("questions")
        .update(payload)
        .eq("id", editingId);
      if (uError) setError(uError.message);
    } else {
      const { error: iError } = await supabase.from("questions").insert(payload);
      if (iError) setError(iError.message);
    }

    setSaving(false);
    if (!error) {
      setShowForm(false);
      resetForm();
      loadQuestions();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    const { error: dError } = await supabase.from("questions").delete().eq("id", id);
    if (dError) {
      setError(dError.message);
      return;
    }
    loadQuestions();
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const a = questions[index];
    const b = questions[newIndex];
    const aOrder = a.sort_order;
    const bOrder = b.sort_order;

    await supabase.from("questions").update({ sort_order: bOrder }).eq("id", a.id);
    await supabase.from("questions").update({ sort_order: aOrder }).eq("id", b.id);
    loadQuestions();
  }

  if (loading) return <LoadingSpinner size={40} />;
  if (error && questions.length === 0) return <ErrorState message={error} onRetry={loadQuestions} />;

  return (
    <div>
      <PageHeader
        title="Questions"
        subtitle="Manage review questions for your customers"
        action={
          !showForm && (
            <button
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Add Question
            </button>
          )
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="card mb-6 space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Question Text</label>
            <input
              className="input"
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Flow Type</label>
              <select
                className="input"
                value={form.flow_type}
                onChange={(e) => setForm({ ...form, flow_type: e.target.value })}
              >
                {FLOW_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sort Order</label>
              <input
                type="number"
                className="input"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Options (comma-separated)
            </label>
            <input
              className="input"
              placeholder="Option 1, Option 2, Option 3, Option 4"
              value={form.optionsText}
              onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Question" : "Create Question"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {questions.length === 0 && !showForm ? (
        <EmptyState message="No questions yet. Click 'Add Question' to create one." />
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">#{q.sort_order + 1}</span>
                    <span className={`badge ${
                      q.flow_type === "ALWAYS" ? "bg-slate-100 text-slate-600"
                        : q.flow_type === "POSITIVE" ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {q.flow_type}
                    </span>
                    {!q.is_active && (
                      <span className="badge bg-slate-100 text-slate-500">inactive</span>
                    )}
                    {q.is_required && (
                      <span className="badge bg-blue-50 text-blue-600">required</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{q.question_text}</p>
                  {q.options && q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.options.map((opt, i) => (
                        <span key={i} className="badge bg-slate-50 text-slate-600">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={index === 0}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={index === questions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    ↓
                  </button>
                  <button className="btn-secondary px-3 py-1 text-xs" onClick={() => startEdit(q)}>
                    Edit
                  </button>
                  <button className="btn-danger px-3 py-1 text-xs" onClick={() => handleDelete(q.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
