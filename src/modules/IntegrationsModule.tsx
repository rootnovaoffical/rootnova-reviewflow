import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { Plus, Plug, Check } from 'lucide-react';
import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// installed_integrations: id, business_id, provider_id, status, config, sync_frequency, last_sync_at, last_sync_status, last_error, health_score, enabled_features, installed_by, created_at, updated_at
const installedColumns: ColumnDef[] = [
  { key: 'status', label: 'Status', type: 'select', options: ['connected', 'disconnected', 'error'], required: true, showInTable: true },
  { key: 'sync_frequency', label: 'Sync Frequency', type: 'select', options: ['realtime', 'hourly', 'daily', 'weekly'], showInTable: true },
  { key: 'last_sync_at', label: 'Last Sync', type: 'date', showInTable: true, editable: false },
  { key: 'health_score', label: 'Health', type: 'number', showInTable: true, editable: false },
  { key: 'config', label: 'Config (JSON)', type: 'json', showInTable: false },
];

// integration_providers: id, provider_key, name, category, description, logo_url, auth_type, auth_config, supported_features, api_base_url, webhook_url_template, rate_limit_per_minute, is_active, is_featured, sort_order, created_at, updated_at
interface Provider { id: string; name: string; provider_key: string; category: string; description: string | null; logo_url: string | null; is_active: boolean; }
interface Props { businessId: string; }

export function InstalledIntegrationsModule({ businessId }: Props) { return <DataManager table="installed_integrations" businessId={businessId} columns={installedColumns} defaultValues={{ status: 'connected', config: {}, sync_frequency: 'daily', health_score: 100, enabled_features: [] }} />; }

export function IntegrationProvidersModule({ businessId }: Props) {
  const { showToast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [installed, setInstalled] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [provRes, instRes] = await Promise.all([
          supabase.from('integration_providers').select('*').eq('is_active', true).order('name'),
          supabase.from('installed_integrations').select('id, provider_id').eq('business_id', businessId),
        ]);
        setProviders(provRes.data as Provider[] || []);
        const map: Record<string, string> = {};
        for (const i of (instRes.data as { id: string; provider_id: string }[])) { map[i.provider_id] = i.id; }
        setInstalled(map);
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [businessId]);

  async function toggleInstall(prov: Provider) {
    try {
      if (installed[prov.id]) {
        const { error } = await supabase.from('installed_integrations').delete().eq('id', installed[prov.id]);
        if (error) throw error;
        setInstalled((prev) => { const n = { ...prev }; delete n[prov.id]; return n; });
        showToast('success', `${prov.name} disconnected`);
      } else {
        const { data, error } = await supabase.from('installed_integrations').insert({ business_id: businessId, provider_id: prov.id, status: 'connected', config: {}, sync_frequency: 'daily', health_score: 100, enabled_features: [] }).select().single();
        if (error) throw error;
        setInstalled((prev) => ({ ...prev, [prov.id]: data.id }));
        showToast('success', `${prov.name} connected`);
      }
    } catch (e) { showToast('error', `Failed: ${(e as Error).message}`); }
  }

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading providers…</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map((prov) => (
        <div key={prov.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">{prov.logo_url ? <img src={prov.logo_url} alt={prov.name} className="w-6 h-6" /> : <Plug className="w-5 h-5 text-blue-400" />}</div>
            <div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-white truncate">{prov.name}</h3><span className="text-xs text-zinc-500">{prov.category}</span></div>
          </div>
          <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{prov.description ?? 'No description'}</p>
          <button onClick={() => toggleInstall(prov)} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${installed[prov.id] ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20' : 'bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30'}`}>
            {installed[prov.id] ? <><Check className="w-3.5 h-3.5" /> Connected</> : <><Plus className="w-3.5 h-3.5" /> Connect</>}
          </button>
        </div>
      ))}
    </div>
  );
}
