import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  flow_type: string;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface QuestionsModuleProps {
  businessId: string;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating' },
];

const FLOW_TYPES = [
  { value: 'ALWAYS', label: 'Always' },
  { value: 'POSITIVE', label: 'Positive (4-5 stars)' },
  { value: 'NEGATIVE', label: 'Negative (1-3 stars)' },
];

export default function QuestionsModule({ businessId }: QuestionsModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    question_text: '',
    question_type: 'text',
    flow_type: 'ALWAYS',
    options: '',
    is_required: false,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, question_type, flow_type, options, is_required, is_active, sort_order')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data ?? []) as Question[]);
    } catch (err) {
      showToast('error', `Failed to load questions: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ question_text: '', question_type: 'text', flow_type: 'ALWAYS', options: '', is_required: false, is_active: true, sort_order: questions.length });
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      flow_type: q.flow_type,
      options: q.options ? q.options.join('\n') : '',
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
      const optionsArray = form.question_type === 'multiple_choice'
        ? form.options.split('\n').map((o) => o.trim()).filter(Boolean)
        : null;

      const payload = {
        business_id: businessId,
        question_text: form.question_text.trim(),
        question_type: form.question_type,
        flow_type: form.flow_type,
        options: optionsArray,
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
      fetchQuestions();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: Question) {
    if (!confirm(`Delete "${q.question_text}"?`)) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', q.id);
      if (error) throw error;
      showToast('success', 'Question deleted');
      fetchQuestions();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  function flowColor(flow: string): string {
    if (flow === 'POSITIVE') return 'green';
    if (flow === 'NEGATIVE') return 'red';
    return 'blue';
  }

  function typeColor(type: string): string {
    if (type === 'multiple_choice') return 'purple';
    if (type === 'rating') return 'yellow';
    return 'gray';
  }

  if (loading) return <LoadingSpinner label="Loading questions..." />;

  return (
    <div>
      <PageHeader
        title="Questions"
        description="Manage review form questions"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Question</Button>}
      />

      {questions.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={HelpCircle} title="No questions yet" description="Create questions for your review form." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Question</Button>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-zinc-600 font-mono mt-0.5">#{q.sort_order}</span>
                    <p className="text-sm font-medium text-white">{q.question_text}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge color={typeColor(q.question_type)}>{q.question_type.replace('_', ' ')}</Badge>
                    <Badge color={flowColor(q.flow_type)}>{q.flow_type}</Badge>
                    {q.is_required && <Badge color="red">Required</Badge>}
                    <Badge color={q.is_active ? 'green' : 'gray'}>{q.is_active ? 'Active' : 'Inactive'}</Badge>
                    {q.options && q.options.length > 0 && (
                      <span className="text-xs text-zinc-500">{q.options.length} options</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(q)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
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
            <TextArea value={form.question_text} onChange={(v) => setForm({ ...form, question_text: v })} placeholder="e.g. How was your experience?" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Question Type</label>
              <Select value={form.question_type} onChange={(v) => setForm({ ...form, question_type: v })}>
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Flow Type</label>
              <Select value={form.flow_type} onChange={(v) => setForm({ ...form, flow_type: v })}>
                {FLOW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>

          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Options (one per line)</label>
              <TextArea value={form.options} onChange={(v) => setForm({ ...form, options: v })} placeholder={'Option 1\nOption 2\nOption 3'} rows={4} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sort Order</label>
            <Input type="number" value={String(form.sort_order)} onChange={(v) => setForm({ ...form, sort_order: parseInt(v) || 0 })} />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/30" />
              <span className="text-sm text-zinc-300">Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/30" />
              <span className="text-sm text-zinc-300">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
