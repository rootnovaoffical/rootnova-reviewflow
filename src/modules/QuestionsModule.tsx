import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Pencil, Trash2 } from 'lucide-react';
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
  created_at: string;
}

const QUESTION_TYPES = ['text', 'multiple_choice', 'rating'];
const FLOW_TYPES = ['ALWAYS', 'POSITIVE', 'NEGATIVE'];

export default function QuestionsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    question_text: '',
    question_type: 'text',
    flow_type: 'ALWAYS',
    optionsText: '',
    is_required: true,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchQuestions();
  }, [businessId]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, question_type, flow_type, options, is_required, is_active, sort_order, created_at')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data as Question[]) ?? []);
    } catch {
      showToast('error', 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ question_text: '', question_type: 'text', flow_type: 'ALWAYS', optionsText: '', is_required: true, is_active: true, sort_order: questions.length });
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      flow_type: q.flow_type,
      optionsText: Array.isArray(q.options) ? q.options.join('\n') : '',
      is_required: q.is_required,
      is_active: q.is_active,
      sort_order: q.sort_order,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.question_text.trim()) {
      showToast('error', 'Question text is required');
      return;
    }
    setSaving(true);
    try {
      const options = form.question_type === 'multiple_choice'
        ? form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        business_id: businessId,
        question_text: form.question_text.trim(),
        question_type: form.question_type,
        flow_type: form.flow_type,
        options,
        is_required: form.is_required,
        is_active: form.is_active,
        sort_order: form.sort_order,
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
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to save question');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('questions').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('success', 'Question deleted');
      setDeleteId(null);
      await fetchQuestions();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to delete question');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading questions..." />;

  return (
    <div>
      <PageHeader
        title="Questions"
        description="Manage your review questions"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Question</Button>}
      />

      {questions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No questions yet" description="Create questions to collect structured feedback from your customers." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Question</Button>} />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge color="blue">{q.question_type}</Badge>
                    <Badge color={q.flow_type === 'ALWAYS' ? 'gray' : q.flow_type === 'POSITIVE' ? 'green' : 'red'}>{q.flow_type}</Badge>
                    {q.is_required && <Badge color="yellow">Required</Badge>}
                    {q.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                    <span className="text-xs text-zinc-600">Order: {q.sort_order}</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-1">{q.question_text}</p>
                  {q.question_type === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.options.map((opt, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-400">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(q.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Question' : 'Add Question'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Question Text</label>
            <TextArea value={form.question_text} onChange={(v) => setForm({ ...form, question_text: v })} placeholder="How was your experience?" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
              <Select value={form.question_type} onChange={(v) => setForm({ ...form, question_type: v })}>
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Flow Type</label>
              <Select value={form.flow_type} onChange={(v) => setForm({ ...form, flow_type: v })}>
                {FLOW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>
          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Options (one per line)</label>
              <TextArea value={form.optionsText} onChange={(v) => setForm({ ...form, optionsText: v })} placeholder="Option 1&#10;Option 2&#10;Option 3" rows={4} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sort Order</label>
              <Input type="number" value={String(form.sort_order)} onChange={(v) => setForm({ ...form, sort_order: parseInt(v) || 0 })} />
            </div>
            <div className="flex items-end gap-4 pb-1">
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
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Question" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this question? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
