import { useEffect, useState } from 'react';
import { FileStack } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  use_count: number;
  is_active: boolean;
}

export default function WorkflowTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, description, category, trigger_type, use_count, is_active')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates((data as WorkflowTemplate[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workflow templates';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function categoryColor(c: string) {
    const map: Record<string, string> = {
      general: 'gray',
      reviews: 'yellow',
      messaging: 'blue',
      growth: 'green',
      retention: 'purple',
    };
    return map[c] ?? 'gray';
  }

  if (loading) return <LoadingSpinner label="Loading templates..." />;

  return (
    <div>
      <PageHeader title="Workflow Templates" description="Pre-built workflow templates you can use" />

      {templates.length === 0 ? (
        <EmptyState icon={FileStack} title="No templates available" description="Workflow templates will appear here once they are published." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-white flex-1 min-w-0">{tpl.name}</h3>
                <Badge color={tpl.is_active ? 'green' : 'gray'}>{tpl.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-zinc-400 mb-3 line-clamp-3 flex-1">{tpl.description}</p>
              <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-white/10">
                <Badge color={categoryColor(tpl.category)}>{tpl.category}</Badge>
                <Badge color="blue">{tpl.trigger_type}</Badge>
                <span className="text-xs text-zinc-500 ml-auto">{tpl.use_count} uses</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
