import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, HelpCircle, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  flow_type: string;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

type FormState = {
  question_text: string;
  question_type: string;
  flow_type: string;
  options: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: string;
};

const EMPTY_FORM: FormState = {
  question_text: '',
  question_type: 'text',
  flow_type: 'ALWAYS',
  options: '',
  is_required: true,
  is_active: true,
  sort_order: '0',
};

export default function QuestionsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, question_type, flow_type, options, is_required, is_active, sort_order')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data as Question[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load questions';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      flow_type: q.flow_type,
      options: Array.isArray(q.options) ? q.options.join('\n') : '',
      is_required: q.is_required,
      is_active: q.is_active,
      sort_order: String(q.sort_order),
    });
    setModalOpen(true);
  }

  function openDelete(q: Question) {
    setDeleteTarget(q);
    setDeleteOpen(true);
  }

  async function handleSave() {
    if (!form.question_text.trim()) {
      showToast('error', 'Question text is required');
      return;
    }

    setSaving(true);
    try {
      const optionsArray =
        form.question_type === 'multiple_choice'
          ? form.options.split('\n').map((o) => o.trim()).filter(Boolean)
          : [];

      const payload = {
        business_id: businessId,
        question_text: form.question_text.trim(),
        question_type: form.question_type,
        flow_type: form.flow_type,
        options: optionsArray,
        is_required: form.is_required,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order || '0', 10) || 0,
      };

      if (editing) {
        const { error } = await supabase.from('questions').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Question updated');
      } else {
        const { error } = await supabase.from('questions').insert(payload);
        if (error) throw error;
        showToast('success', 'Question created');
      }
      setModalOpen(false);
      await fetchQuestions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save question';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('questions').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'Question deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchQuestions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete question';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  const typeColor = (t: string) => (t === 'rating' ? 'yellow' : t === 'multiple_choice' ? 'purple' : 'blue');
  const flowColor = (f: string) => (f === 'POSITIVE' ? 'green' : f === 'NEGATIVE' ? 'red' : 'gray');

  if (loading) return <LoadingSpinner label="Loading questions..." />;

  return (
    <div>
      <PageHeader
        title="Questions"
        description="Manage your review flow questions"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Question</Button>}
      />

      {questions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions yet"
          description="Create questions to build your review flow."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Question</Button>}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
                    <Badge color="gray">#{q.sort_order}</Badge>
                    <Badge color={typeColor(q.question_type)}>{q.question_type}</Badge>
                    <Badge color={flowColor(q.flow_type)}>{q.flow_type}</Badge>
                    {q.is_required && <Badge color="yellow">Required</Badge>}
                    <Badge color={q.is_active ? 'green' : 'gray'}>{q.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-sm text-white font-medium mb-1">{q.question_text}</p>
                  {q.question_type === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.options.map((opt, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openDelete(q)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Question' : 'New Question'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Question Text</label>
            <TextArea value={form.question_text} onChange={(v) => setForm({ ...form, question_text: v })} placeholder="e.g. How was your experience today?" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Question Type</label>
              <Select value={form.question_type} onChange={(v) => setForm({ ...form, question_type: v })}>
                <option value="text">Text</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="rating">Rating</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Flow Type</label>
              <Select value={form.flow_type} onChange={(v) => setForm({ ...form, flow_type: v })}>
                <option value="ALWAYS">Always</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEGATIVE">Negative</option>
              </Select>
            </div>
          </div>
          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Options (one per line)</label>
              <TextArea value={form.options} onChange={(v) => setForm({ ...form, options: v })} placeholder="Great&#10;Good&#10;Okay&#10;Poor" rows={4} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sort Order</label>
              <Input type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="w-4 h-4 rounded accent-blue-500" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-blue-500" />
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Question" maxWidth="max-w-md">
        <p className="text-sm text-zinc-300 mb-6">
          Are you sure you want to delete this question? This action cannot be undone.
        </p>
        {deleteTarget && <p className="text-sm text-white bg-white/5 border border-white/10 rounded-lg p-3 mb-6">"{deleteTarget.question_text}"</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
