import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Workflow, Sparkles } from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  trigger_type: string;
  use_count: number;
  is_active: boolean;
}

export default function WorkflowTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, [businessId]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, description, category, trigger_type, use_count, is_active')
        .order('use_count', { ascending: false });
      if (error) throw error;
      setTemplates((data ?? []) as WorkflowTemplate[]);
    } catch {
      showToast('error', 'Failed to load workflow templates');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading templates..." />;

  return (
    <div>
      <PageHeader title="Workflow Templates" description="Pre-built workflow templates you can use for your business" />

      {templates.length === 0 ? (
        <EmptyState icon={Sparkles} title="No templates available" description="Workflow templates will appear here when they become available." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="p-4 hover:border-blue-400/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{t.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-3">{t.description || 'No description'}</p>
                </div>
                {t.is_active ? (
                  <Badge color="green">Active</Badge>
                ) : (
                  <Badge color="gray">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <Badge color="purple">{t.category}</Badge>
                <Badge color="blue">{t.trigger_type}</Badge>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Workflow className="w-3 h-3" />
                  {t.use_count} {t.use_count === 1 ? 'use' : 'uses'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
