import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { Building2, Users, GitBranch, Map, ShieldCheck, Mail, Globe } from 'lucide-react';

/* ============================================================
 * OrganizationsModule
 * ============================================================ */

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  contact_email: string | null;
  status: string | null;
}

export function OrganizationsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', organizationId).single();
      if (error) showToast('error', `Failed to load organization: ${error.message}`);
      else setOrg(data as Organization);
      setLoading(false);
    })();
  }, [organizationId, showToast]);

  if (loading) return <LoadingSpinner label="Loading organization…" />;

  if (!org) {
    return <EmptyState icon={Building2} title="Organization not found" description="The organization record could not be loaded." />;
  }

  return (
    <div>
      <PageHeader title="Organization" description="Organization details" />
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-white">{org.name}</h3>
            <p className="text-sm text-zinc-500 font-mono">{org.slug}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500">Type</p>
              <p className="text-sm text-white">{org.type || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500">Contact Email</p>
              <p className="text-sm text-white">{org.contact_email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              {org.status ? <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status}</Badge> : <span className="text-sm text-zinc-600">—</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * OrganizationMembersModule
 * ============================================================ */

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  status: string | null;
}

export function OrganizationMembersModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) showToast('error', `Failed to load members: ${error.message}`);
    else setMembers((data as OrganizationMember[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading members…" />;

  return (
    <div>
      <PageHeader title="Organization Members" description="Members of this organization" />

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No members" description="Organization members will appear here." />
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-white truncate">{m.user_id}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {m.role && <Badge color="blue">{m.role}</Badge>}
                      {m.status && <Badge color={m.status === 'active' ? 'green' : 'gray'}>{m.status}</Badge>}
                    </div>
                  </div>
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
 * EnterpriseBranchesModule
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
}

function healthColor(score: number | null): string {
  if (score === null) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function EnterpriseBranchesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<EnterpriseBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enterprise_branches')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (error) showToast('error', `Failed to load branches: ${error.message}`);
    else setBranches((data as EnterpriseBranch[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading branches…" />;

  return (
    <div>
      <PageHeader title="Enterprise Branches" description="Branch locations for this organization" />

      {branches.length === 0 ? (
        <EmptyState icon={GitBranch} title="No branches" description="Enterprise branches will appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {branches.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{b.name}</h3>
                  {b.branch_code && <p className="text-xs text-zinc-500 font-mono">{b.branch_code}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {b.status && <Badge color={b.status === 'active' ? 'green' : 'gray'}>{b.status}</Badge>}
                  {b.health_score !== null && <Badge color={healthColor(b.health_score)}>{b.health_score}</Badge>}
                </div>
              </div>
              {(b.city || b.state) && (
                <p className="text-sm text-zinc-400">{[b.city, b.state].filter(Boolean).join(', ')}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * EnterpriseRegionsModule
 * ============================================================ */

interface EnterpriseRegion {
  id: string;
  organization_id: string;
  name: string;
  region_type: string | null;
  code: string | null;
  status: string | null;
}

export function EnterpriseRegionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [regions, setRegions] = useState<EnterpriseRegion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enterprise_regions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (error) showToast('error', `Failed to load regions: ${error.message}`);
    else setRegions((data as EnterpriseRegion[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading regions…" />;

  return (
    <div>
      <PageHeader title="Enterprise Regions" description="Regional groupings for this organization" />

      {regions.length === 0 ? (
        <EmptyState icon={Map} title="No regions" description="Enterprise regions will appear here." />
      ) : (
        <div className="space-y-3">
          {regions.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Map className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{r.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {r.region_type && <Badge color="blue">{r.region_type}</Badge>}
                      {r.code && <span className="text-xs text-zinc-500 font-mono">{r.code}</span>}
                    </div>
                  </div>
                </div>
                {r.status && <Badge color={r.status === 'active' ? 'green' : 'gray'}>{r.status}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * OrganizationPoliciesModule
 * ============================================================ */

interface OrganizationPolicy {
  id: string;
  organization_id: string;
  policy_key: string;
  policy_type: string | null;
  name: string;
  description: string | null;
  status: string | null;
}

export function OrganizationPoliciesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<OrganizationPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (error) showToast('error', `Failed to load policies: ${error.message}`);
    else setPolicies((data as OrganizationPolicy[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading policies…" />;

  return (
    <div>
      <PageHeader title="Organization Policies" description="Policy configurations for this organization" />

      {policies.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No policies" description="Organization policies will appear here." />
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{p.name}</h3>
                    {p.status && <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-zinc-400 mb-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {p.policy_key && <Badge color="purple">{p.policy_key}</Badge>}
                    {p.policy_type && <Badge color="blue">{p.policy_type}</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
