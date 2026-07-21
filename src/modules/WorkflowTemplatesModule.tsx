import { useEffect, useState } from 'react';
import { Layers, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  trigger_type: string;
  use_count: number;
  is_active: boolean;
  is_ai_generated: boolean;
}

export default function WorkflowTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, description, category, trigger_type, use_count, is_active, is_ai_generated')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching workflow templates:', err);
      showToast('error', 'Failed to load workflow templates');
    } finally {
      setLoading(false);
    }
  }

  function categoryColor(category: string): string {
    const map: Record<string, string> = {
      general: 'blue',
      marketing: 'purple',
      support: 'green',
      feedback: 'yellow',
      engagement: 'blue',
      retention: 'green',
    };
    return map[category] || 'gray';
  }

  if (loading) return <LoadingSpinner label="Loading templates..." />;

  return (
    <div>
      <PageHeader
        title="Workflow Templates"
        description="Pre-built workflow templates you can use as a starting point"
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No templates available"
          description="Workflow templates will appear here once they are published."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  {tpl.is_ai_generated && (
                    <Badge color="purple">
                      <Sparkles className="w-3 h-3 mr-0.5" />
                      AI
                    </Badge>
                  )}
                  <Badge color={tpl.is_active ? 'green' : 'gray'}>
                    {tpl.is_active ? 'active' : 'inactive'}
                  </Badge>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1">{tpl.name}</h3>
              <p className="text-xs text-zinc-400 line-clamp-3 flex-1 mb-3">
                {tpl.description || 'No description available.'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                <Badge color={categoryColor(tpl.category)}>{tpl.category}</Badge>
                <Badge color="blue">{tpl.trigger_type}</Badge>
                <span className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
                  <TrendingUp className="w-3 h-3" />
                  {tpl.use_count} uses
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
