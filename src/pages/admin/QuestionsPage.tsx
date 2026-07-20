// Questions management — RootNova admin picks a business to manage; Business
// admin is scoped to their own business.

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { listBusinesses, getMyBusiness } from "../../lib/business";
import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from "../../lib/questions";
import type { Business, Question } from "../../types";
import { Button, Card, Select, Badge, Loading, EmptyState, Modal, Input, } from "../../components/ui";
import { HelpCircle, Plus, Pencil, Trash2, X, Store } from "lucide-react";

export default function QuestionsPage() {
  const { role } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (role === "BUSINESS_ADMIN") {
          const biz = await getMyBusiness();
          if (biz) { setBusinesses([biz]); setSelectedId(biz.id); }
        } else {
          const list = await listBusinesses();
          setBusinesses(list);
          if (list[0]) setSelectedId(list[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setLoading(true);
      try { setQuestions(await listQuestions(selectedId)); } finally { setLoading(false); }
    })();
  }, [selectedId]);

  async function load() {
    if (!selectedId) return;
    setQuestions(await listQuestions(selectedId));
  }

  async function handleDelete(q: Question) {
    if (!confirm(`Delete "${q.question_text}"?`)) return;
    try { await deleteQuestion(q.id); await load(); } catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  }

  if (loading) return <Loading label="Loading questions..." />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Questions</h1>
          <p className="mt-1 text-sm text-slate-400">Manage the multiple-choice questions customers answer.</p>
        </div>
        <div className="flex items-center gap-2">
          {role === "ROOTNOVA_ADMIN" && businesses.length > 0 && (
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-56">
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
          <Button onClick={() => { setEditing(null); setShowForm(true); }} disabled={!selectedId}><Plus className="w-4 h-4" /> New question</Button>
        </div>
      </header>

      {!selectedId ? (
        <Card className="p-8"><EmptyState icon={<Store className="w-10 h-10" />} title="No business selected" description={role === "BUSINESS_ADMIN" ? "You haven't been assigned to a business yet." : "Create a business first."} /></Card>
      ) : questions.length === 0 ? (
        <Card className="p-8"><EmptyState icon={<HelpCircle className="w-10 h-10" />} title="No questions yet" description="Add multiple-choice questions for your review flow." action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> Create question</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{q.question_text}</p>
                    <Badge color={q.flow_type === "ALWAYS" ? "blue" : q.flow_type === "POSITIVE" ? "green" : "amber"}>{q.flow_type}</Badge>
                    {!q.is_active && <Badge color="slate">inactive</Badge>}
                    {!q.is_required && <Badge color="slate">optional</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.options.map((opt, i) => <span key={i} className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300">{opt}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditing(q); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(q)} className="p-1.5 rounded-lg text-rose-400 hover:bg-slate-800 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <QuestionFormModal
          businessId={selectedId}
          question={editing}
          sortOrder={questions.length}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function QuestionFormModal({ businessId, question, sortOrder, onClose, onSaved }: {
  businessId: string; question: Question | null; sortOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [questionText, setQuestionText] = useState(question?.question_text || "");
  const [flowType, setFlowType] = useState<"ALWAYS" | "POSITIVE" | "NEGATIVE">(question?.flow_type || "ALWAYS");
  const [options, setOptions] = useState<string[]>(question?.options?.length ? question.options : [""]);
  const [isRequired, setIsRequired] = useState(question?.is_required ?? true);
  const [isActive, setIsActive] = useState(question?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }
  function addOption() { setOptions((prev) => [...prev, ""]); }
  function removeOption(i: number) { setOptions((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!questionText.trim()) { setError("Question text is required."); return; }
    if (cleanOptions.length < 2) { setError("Provide at least 2 options."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { question_text: questionText.trim(), flow_type: flowType, options: cleanOptions, is_required: isRequired, is_active: isActive, sort_order: question?.sort_order ?? sortOrder };
      if (question) await updateQuestion(question.id, payload);
      else await createQuestion(businessId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={question ? "Edit question" : "New question"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Question text" required value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="What did you enjoy most?" />
        <Select label="Flow type" value={flowType} onChange={(e) => setFlowType(e.target.value as "ALWAYS" | "POSITIVE" | "NEGATIVE")}>
          <option value="ALWAYS">Always (shown for every rating)</option>
          <option value="POSITIVE">Positive (shown for 4-5 stars)</option>
          <option value="NEGATIVE">Negative (shown for 1-3 stars)</option>
        </Select>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Multiple-choice options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 rounded-xl bg-slate-950/60 border border-slate-700 px-3.5 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                {options.length > 1 && <button type="button" onClick={() => removeOption(i)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-300"><X className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"><Plus className="w-3.5 h-3.5 inline" /> Add option</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 cursor-pointer">
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="accent-indigo-500" />
            <span className="text-sm text-slate-300">Required</span>
          </label>
          <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-500" />
            <span className="text-sm text-slate-300">Active</span>
          </label>
        </div>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{question ? "Save changes" : "Create question"}</Button>
        </div>
      </form>
    </Modal>
  );
}
