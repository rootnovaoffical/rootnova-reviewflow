import { useState, useEffect } from 'react';
import { FileStack } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  trigger_type: string | null;
  use_count: number;
  is_active: boolean;
}

interface WorkflowTemplatesModuleProps {
  businessId: string;
}

export default function WorkflowTemplatesModule({ businessId: _businessId }: WorkflowTemplatesModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, description, category, trigger_type, use_count, is_active')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates((data ?? []) as WorkflowTemplate[]);
    } catch (err) {
      showToast('error', `Failed to load templates: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function categoryColor(category: string | null): string {
    if (!category) return 'gray';
    const map: Record<string, string> = {
      general: 'blue',
      reviews: 'green',
      marketing: 'purple',
      support: 'yellow',
      onboarding: 'blue',
      retention: 'green',
    };
    return map[category] ?? 'gray';
  }

  if (loading) return <LoadingSpinner label="Loading templates..." />;

  return (
    <div>
      <PageHeader title="Workflow Templates" description="Pre-built workflow templates — install and customize for your business" />

      {templates.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={FileStack} title="No templates available" description="Workflow templates will appear here when they are published." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileStack className="w-5 h-5 text-blue-400" />
                </div>
                <Badge color={tpl.is_active ? 'green' : 'gray'}>
                  {tpl.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <h3 className="text-sm font-semibold text-white mt-2">{tpl.name}</h3>
              {tpl.description && (
                <p className="text-sm text-zinc-400 mt-1 flex-1 line-clamp-3">{tpl.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                {tpl.category && (
                  <Badge color={categoryColor(tpl.category)}>{tpl.category}</Badge>
                )}
                {tpl.trigger_type && (
                  <Badge color="blue">{tpl.trigger_type.replace(/_/g, ' ')}</Badge>
                )}
                <span className="text-xs text-zinc-500 ml-auto">
                  {tpl.use_count} use{tpl.use_count !== 1 ? 's' : ''}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
