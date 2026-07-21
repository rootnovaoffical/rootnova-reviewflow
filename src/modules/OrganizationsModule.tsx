import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Card, Badge,
  PageHeader, LoadingSpinner, EmptyState,
} from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  Building2, Users, GitBranch, MapPin, ShieldCheck,
} from 'lucide-react';

function statusColor(status: string | null) {
  if (!status) return 'gray';
  const s = status.toLowerCase();
  if (['active', 'enabled'].includes(s)) return 'green';
  if (['pending', 'invited'].includes(s)) return 'yellow';
  if (['suspended', 'disabled', 'inactive'].includes(s)) return 'red';
  return 'gray';
}

/* ------------------------------------------------------------------ */
/* OrganizationsModule                                               */
/* ------------------------------------------------------------------ */

type Organization = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  contact_email: string | null;
  status: string | null;
};

export function OrganizationsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, type, contact_email, status')
        .eq('id', organizationId)
        .maybeSingle();
      if (error) throw error;
      setOrg(data);
    } catch (err) {
      showToast('error', `Failed to load organization: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading organization…" />;

  if (!org) {
    return <EmptyState icon={Building2} title="Organization not found" />;
  }

  return (
    <div>
      <PageHeader title="Organization" description="Organization details" />
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{org.name}</h3>
            <p className="text-sm text-zinc-500 font-mono">{org.slug}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Type</p>
            <p className="text-white">{org.type || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Contact Email</p>
            <p className="text-white">{org.contact_email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <Badge color={statusColor(org.status)}>{org.status}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OrganizationMembersModule                                         */
/* ------------------------------------------------------------------ */

type OrganizationMember = {
  id: string;
  user_id: string;
  role: string | null;
  status: string | null;
};

export function OrganizationMembersModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load members: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading members…" />;

  return (
    <div>
      <PageHeader title="Organization Members" description="Members of this organization" />
      {items.length === 0 ? (
        <EmptyState icon={Users} title="No members" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-zinc-300">{m.user_id}</td>
                  <td className="px-4 py-3"><Badge color="blue">{m.role}</Badge></td>
                  <td className="px-4 py-3"><Badge color={statusColor(m.status)}>{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EnterpriseBranchesModule                                          */
/* ------------------------------------------------------------------ */

type EnterpriseBranch = {
  id: string;
  name: string;
  branch_code: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  health_score: number | null;
};

function healthColor(score: number | null) {
  if (score === null) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function EnterpriseBranchesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<EnterpriseBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enterprise_branches')
        .select('id, name, branch_code, city, state, status, health_score')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load branches: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading branches…" />;

  return (
    <div>
      <PageHeader title="Enterprise Branches" description="Branch locations for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={GitBranch} title="No branches" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{b.name}</h3>
                <Badge color={statusColor(b.status)}>{b.status}</Badge>
              </div>
              {b.branch_code && <p className="text-sm text-zinc-500 font-mono mb-2">{b.branch_code}</p>}
              <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-2">
                <MapPin className="w-3.5 h-3.5" />
                {[b.city, b.state].filter(Boolean).join(', ') || '—'}
              </div>
              {b.health_score !== null && <Badge color={healthColor(b.health_score)}>Health: {b.health_score}</Badge>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EnterpriseRegionsModule                                           */
/* ------------------------------------------------------------------ */

type EnterpriseRegion = {
  id: string;
  name: string;
  region_type: string | null;
  code: string | null;
  status: string | null;
};

export function EnterpriseRegionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<EnterpriseRegion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enterprise_regions')
        .select('id, name, region_type, code, status')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load regions: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading regions…" />;

  return (
    <div>
      <PageHeader title="Enterprise Regions" description="Regional groupings for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={MapPin} title="No regions" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Region Type</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3"><Badge color="purple">{r.region_type}</Badge></td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{r.code || '—'}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(r.status)}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OrganizationPoliciesModule                                        */
/* ------------------------------------------------------------------ */

type OrganizationPolicy = {
  id: string;
  policy_key: string;
  policy_type: string | null;
  name: string;
  description: string | null;
  status: string | null;
};

export function OrganizationPoliciesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<OrganizationPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_policies')
        .select('id, policy_key, policy_type, name, description, status')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load policies: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading policies…" />;

  return (
    <div>
      <PageHeader title="Organization Policies" description="Policies configured for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No policies" />
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    {p.policy_type && <Badge color="blue">{p.policy_type}</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500 font-mono mb-1">{p.policy_key}</p>
                  {p.description && <p className="text-sm text-zinc-400">{p.description}</p>}
                </div>
                <Badge color={statusColor(p.status)}>{p.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
