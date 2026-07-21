import { useState, useEffect } from 'react';
import { FileStack, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  use_count: number;
  is_active: boolean;
  is_ai_generated: boolean;
}

export default function WorkflowTemplatesModule({ businessId }: { businessId: string }) {
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
        .select('id, name, description, category, trigger_type, use_count, is_active, is_ai_generated')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates((data as WorkflowTemplate[]) ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading templates..." />;

  return (
    <div>
      <PageHeader title="Workflow Templates" description="Pre-built workflow templates you can use" />

      {templates.length === 0 ? (
        <EmptyState icon={FileStack} title="No templates available" description="Workflow templates will appear here once they are published." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="p-4 hover:border-blue-400/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{t.name}</h3>
                    {t.is_ai_generated && <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge color="blue">{t.category}</Badge>
                    <Badge color="purple">{t.trigger_type}</Badge>
                    {t.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-3 mb-3 min-h-[3.75rem]">
                {t.description || <span className="text-zinc-600 italic">No description</span>}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-xs text-zinc-500">
                  Used <span className="text-zinc-300 font-medium">{t.use_count}</span> times
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
