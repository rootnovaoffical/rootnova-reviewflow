import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { Plus, FileStack } from 'lucide-react';

interface Template { id: string; template_key: string; name: string; description: string; category: string; trigger_type: string; is_active: boolean; use_count: number; }
interface Props { businessId: string; }

export default function WorkflowTemplatesModule({ businessId }: Props) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try { const { data, error } = await supabase.from('workflow_templates').select('*').eq('is_active', true).order('name'); if (error) throw error; setTemplates(data as Template[]); }
      catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  async function instantiateTemplate(tpl: Template) {
    try {
      const { error } = await supabase.from('workflows').insert({ business_id: businessId, name: `${tpl.name} (from template)`, description: tpl.description, status: 'draft', trigger_type: tpl.trigger_type });
      if (error) throw error;
      await supabase.from('workflow_templates').update({ use_count: tpl.use_count + 1 }).eq('id', tpl.id);
      showToast('success', 'Workflow created from template');
      setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, use_count: t.use_count + 1 } : t));
    } catch (e) { showToast('error', `Failed: ${(e as Error).message}`); }
  }

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading templates…</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => (
        <div key={tpl.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-5 hover:border-blue-400/30 transition-colors">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><FileStack className="w-5 h-5 text-blue-400" /></div>
            <div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-white truncate">{tpl.name}</h3><span className="text-xs text-zinc-500">{tpl.category}</span></div>
          </div>
          <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{tpl.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Used {tpl.use_count}x</span>
            <button onClick={() => instantiateTemplate(tpl)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 text-xs font-medium transition-colors"><Plus className="w-3.5 h-3.5" /> Use Template</button>
          </div>
        </div>
      ))}
    </div>
  );
}
