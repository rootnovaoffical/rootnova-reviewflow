import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, HelpCircle, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  TextArea,
  Select,
  Modal,
} from '../components/UI';

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

const QUESTION_TYPES = ['text', 'multiple_choice', 'rating'];
const FLOW_TYPES = ['ALWAYS', 'POSITIVE', 'NEGATIVE'];

export default function QuestionsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  // form state
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
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      showToast('error', 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      question_text: '',
      question_type: 'text',
      flow_type: 'ALWAYS',
      optionsText: '',
      is_required: true,
      is_active: true,
      sort_order: questions.length,
    });
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      flow_type: q.flow_type,
      optionsText: (q.options || []).join(', '),
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
      const options =
        form.question_type === 'multiple_choice'
          ? form.optionsText
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : null;

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
    } catch (err) {
      console.error('Error saving question:', err);
      showToast('error', 'Failed to save question');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'Question deleted');
      setDeleteTarget(null);
      await fetchQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
      showToast('error', 'Failed to delete question');
    }
  }

  function typeColor(type: string): string {
    switch (type) {
      case 'text':
        return 'blue';
      case 'multiple_choice':
        return 'purple';
      case 'rating':
        return 'yellow';
      default:
        return 'gray';
    }
  }

  function flowColor(flow: string): string {
    switch (flow) {
      case 'ALWAYS':
        return 'blue';
      case 'POSITIVE':
        return 'green';
      case 'NEGATIVE':
        return 'red';
      default:
        return 'gray';
    }
  }

  if (loading) return <LoadingSpinner label="Loading questions..." />;

  return (
    <div>
      <PageHeader
        title="Questions"
        description="Manage the survey questions customers answer"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Question
          </Button>
        }
      />

      {questions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions yet"
          description="Create your first survey question to start collecting structured feedback."
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-1 mt-0.5 text-zinc-600">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs text-zinc-500">#{q.sort_order}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white mb-2">{q.question_text}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={typeColor(q.question_type)}>{q.question_type}</Badge>
                      <Badge color={flowColor(q.flow_type)}>{q.flow_type}</Badge>
                      {q.is_required && <Badge color="red">required</Badge>}
                      <Badge color={q.is_active ? 'green' : 'gray'}>
                        {q.is_active ? 'active' : 'inactive'}
                      </Badge>
                      {q.question_type === 'multiple_choice' && q.options && (
                        <span className="text-xs text-zinc-500">
                          {q.options.length} options
                        </span>
                      )}
                    </div>
                    {q.question_type === 'multiple_choice' && q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.options.map((opt, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs bg-white/5 text-zinc-400 border border-white/10"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(q)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Question' : 'New Question'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Question Text</label>
            <TextArea
              value={form.question_text}
              onChange={(v) => setForm({ ...form, question_text: v })}
              placeholder="e.g. How was your experience today?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
              <Select
                value={form.question_type}
                onChange={(v) => setForm({ ...form, question_type: v })}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Flow Type</label>
              <Select
                value={form.flow_type}
                onChange={(v) => setForm({ ...form, flow_type: v })}
              >
                {FLOW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Options (comma-separated)
              </label>
              <Input
                value={form.optionsText}
                onChange={(v) => setForm({ ...form, optionsText: v })}
                placeholder="Great, Good, Okay, Poor"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sort Order</label>
            <Input
              type="number"
              value={String(form.sort_order)}
              onChange={(v) => setForm({ ...form, sort_order: parseInt(v) || 0 })}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/50"
              />
              <span className="text-sm text-zinc-300">Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/50"
              />
              <span className="text-sm text-zinc-300">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Question"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Are you sure you want to delete this question? This action cannot be undone.
          </p>
          {deleteTarget && (
            <p className="text-sm text-zinc-500 bg-white/5 rounded-lg p-3 border border-white/10">
              {deleteTarget.question_text}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
