import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { HelpCircle, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

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

const emptyForm = {
  question_text: '',
  question_type: 'text',
  flow_type: 'ALWAYS',
  options: '',
  is_required: false,
  is_active: true,
  sort_order: 0,
};

export default function QuestionsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchQuestions();
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
    } catch {
      showToast('error', 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: questions.length });
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      flow_type: q.flow_type,
      options: q.options ? q.options.join(', ') : '',
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
      const payload: Record<string, unknown> = {
        business_id: businessId,
        question_text: form.question_text,
        question_type: form.question_type,
        flow_type: form.flow_type,
        is_required: form.is_required,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (form.question_type === 'multiple_choice') {
        payload.options = form.options.split(',').map((o) => o.trim()).filter(Boolean);
      } else {
        payload.options = null;
      }

      if (editingId) {
        const { error } = await supabase.from('questions').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('success', 'Question updated');
      } else {
        const { error } = await supabase.from('questions').insert(payload);
        if (error) throw error;
        showToast('success', 'Question created');
      }
      setModalOpen(false);
      await fetchQuestions();
    } catch {
      showToast('error', 'Failed to save question');
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
      setDeleteOpen(false);
      setDeleteId(null);
      await fetchQuestions();
    } catch {
      showToast('error', 'Failed to delete question');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading questions..." />;

  return (
    <div>
      <PageHeader
        title="Questions"
        description="Manage review questions for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Question</Button>}
      />

      {questions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No questions yet" description="Create questions to collect customer feedback." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Question</Button>} />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <GripVertical className="w-4 h-4 text-zinc-600" />
                    <span className="text-sm text-zinc-500">#{q.sort_order}</span>
                    <Badge color="blue">{q.question_type}</Badge>
                    <Badge color={q.flow_type === 'ALWAYS' ? 'gray' : q.flow_type === 'POSITIVE' ? 'green' : 'red'}>{q.flow_type}</Badge>
                    {q.is_required && <Badge color="yellow">Required</Badge>}
                    <Badge color={q.is_active ? 'green' : 'gray'}>{q.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-sm text-white font-medium mb-1">{q.question_text}</p>
                  {q.options && q.options.length > 0 && (
                    <p className="text-xs text-zinc-500">Options: {q.options.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(q.id); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Question' : 'Add Question'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Question Text</label>
            <TextArea value={form.question_text} onChange={(v) => setForm({ ...form, question_text: v })} placeholder="Enter your question..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Question Type</label>
              <Select value={form.question_type} onChange={(v) => setForm({ ...form, question_type: v })}>
                <option value="text">Text</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="rating">Rating</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Flow Type</label>
              <Select value={form.flow_type} onChange={(v) => setForm({ ...form, flow_type: v })}>
                <option value="ALWAYS">Always</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEGATIVE">Negative</option>
              </Select>
            </div>
          </div>
          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Options (comma-separated)</label>
              <Input value={form.options} onChange={(v) => setForm({ ...form, options: v })} placeholder="Option 1, Option 2, Option 3" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Sort Order</label>
              <Input type="number" value={String(form.sort_order)} onChange={(v) => setForm({ ...form, sort_order: parseInt(v) || 0 })} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="accent-blue-500" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-blue-500" />
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Question" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this question? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
