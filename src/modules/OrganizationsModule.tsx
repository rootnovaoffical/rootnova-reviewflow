import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge,
} from '../components/UI';
import { Building2, Users, Network, Shield, MapPin } from 'lucide-react';

/* ============================================================
 * OrganizationsModule — Read-only single org display
 * ============================================================ */

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  contact_email: string | null;
  status: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function OrganizationsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!organizationId) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();
      if (error) {
        showToast('error', `Failed to load organization: ${error.message}`);
      } else {
        setOrg(data as Organization | null);
      }
      setLoading(false);
    }
    load();
  }, [organizationId, showToast]);

  if (loading) return <LoadingSpinner label="Loading organization…" />;

  if (!org) {
    return (
      <div>
        <PageHeader title="Organization" description="Organization details" />
        <EmptyState icon={Building2} title="No organization" description="This business is not associated with an organization." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Organization" description="Organization details" />

      <Card className="p-6">
        <div className="flex items-start gap-4">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-white">{org.name}</h3>
              <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status ?? '—'}</Badge>
            </div>
            <p className="text-sm text-zinc-500">{org.slug}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Type</p>
            <p className="text-white">{org.type ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Contact Email</p>
            <p className="text-white">{org.contact_email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status ?? '—'}</Badge>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Slug</p>
            <p className="text-white">{org.slug}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * OrganizationMembersModule — Read-only list
 * ============================================================ */

interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function OrganizationMembersModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load members: ${error.message}`);
    } else {
      setItems((data as OrgMember[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading members…" />;

  return (
    <div>
      <PageHeader title="Organization Members" description="Members of this organization" />

      {items.length === 0 ? (
        <EmptyState icon={Users} title="No members" description="Organization members will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">User ID</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3"><code className="text-blue-300 text-xs">{m.user_id}</code></td>
                    <td className="px-4 py-3"><Badge color="blue">{m.role ?? '—'}</Badge></td>
                    <td className="px-4 py-3"><Badge color={m.status === 'active' ? 'green' : 'gray'}>{m.status ?? '—'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * EnterpriseBranchesModule — Read-only list
 * ============================================================ */

interface EnterpriseBranch {
  id: string;
  organization_id: string;
  name: string;
  branch_code: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  health_score: number | null;
  created_at: string;
  updated_at: string;
}

function healthColor(score: number | null): string {
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
    const { data, error } = await supabase
      .from('enterprise_branches')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load branches: ${error.message}`);
    } else {
      setItems((data as EnterpriseBranch[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading branches…" />;

  return (
    <div>
      <PageHeader title="Enterprise Branches" description="Branch locations for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={Network} title="No branches" description="Enterprise branches will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <Card key={b.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{b.name}</h3>
                    {b.branch_code && <p className="text-xs text-zinc-500">{b.branch_code}</p>}
                  </div>
                </div>
                <Badge color={b.status === 'active' ? 'green' : 'gray'}>{b.status ?? '—'}</Badge>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-zinc-400"><span className="text-zinc-500">City:</span> {b.city ?? '—'}</p>
                <p className="text-zinc-400"><span className="text-zinc-500">State:</span> {b.state ?? '—'}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-zinc-500 text-xs">Health:</span>
                  <Badge color={healthColor(b.health_score)}>{b.health_score !== null ? `${b.health_score}%` : '—'}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * EnterpriseRegionsModule — Read-only list
 * ============================================================ */

interface EnterpriseRegion {
  id: string;
  organization_id: string;
  name: string;
  region_type: string | null;
  code: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function EnterpriseRegionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<EnterpriseRegion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enterprise_regions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load regions: ${error.message}`);
    } else {
      setItems((data as EnterpriseRegion[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading regions…" />;

  return (
    <div>
      <PageHeader title="Enterprise Regions" description="Regional groupings for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={Network} title="No regions" description="Enterprise regions will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Region Type</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                    <td className="px-4 py-3"><Badge color="blue">{r.region_type ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-300">{r.code ?? '—'}</td>
                    <td className="px-4 py-3"><Badge color={r.status === 'active' ? 'green' : 'gray'}>{r.status ?? '—'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * OrganizationPoliciesModule — Read-only list
 * ============================================================ */

interface OrgPolicy {
  id: string;
  organization_id: string;
  policy_key: string;
  policy_type: string | null;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function OrganizationPoliciesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<OrgPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load policies: ${error.message}`);
    } else {
      setItems((data as OrgPolicy[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading policies…" />;

  return (
    <div>
      <PageHeader title="Organization Policies" description="Policy configurations for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={Shield} title="No policies" description="Organization policies will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">{p.name}</h3>
                </div>
                <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status ?? '—'}</Badge>
              </div>
              {p.description && <p className="text-sm text-zinc-400">{p.description}</p>}
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge color="purple">{p.policy_key}</Badge>
                {p.policy_type && <Badge color="blue">{p.policy_type}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
