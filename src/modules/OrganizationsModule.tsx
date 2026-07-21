import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Building2, Users, GitBranch, MapPin, Shield, Mail } from 'lucide-react';

/* ============================================================
 * OrganizationsModule
 * Show the single organization record. Read-only display.
 * Show: name, slug, type, contact_email, status
 * ============================================================ */

interface Organization {
  id: string;
  name: string;
  slug: string | null;
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
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();
      if (error) {
        showToast('error', `Failed to load organization: ${error.message}`);
      } else {
        setOrg(data);
      }
      setLoading(false);
    })();
  }, [organizationId, showToast]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['active', 'verified'].includes(s)) return 'green';
    if (['suspended', 'banned'].includes(s)) return 'red';
    if (['pending', 'trial'].includes(s)) return 'yellow';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Organization" description="Organization details" />
      {loading ? (
        <LoadingSpinner label="Loading organization..." />
      ) : !org ? (
        <EmptyState icon={Building2} title="Organization not found" description="The organization record could not be loaded." />
      ) : (
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white">{org.name}</h3>
              {org.slug && <p className="text-sm text-zinc-500 font-mono">{org.slug}</p>}
              {org.status && <div className="mt-1"><Badge color={statusColor(org.status)}>{org.status}</Badge></div>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Type</p>
              <p className="text-sm text-white">{org.type || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Contact Email</p>
              <p className="text-sm text-white flex items-center gap-1.5">
                {org.contact_email ? (
                  <>
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    {org.contact_email}
                  </>
                ) : '—'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * OrganizationMembersModule
 * List organization_members filtered by organization_id. Read-only.
 * Show: user_id, role, status
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

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load members: ${error.message}`);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['active', 'confirmed'].includes(s)) return 'green';
    if (['invited', 'pending'].includes(s)) return 'yellow';
    if (['removed', 'disabled'].includes(s)) return 'red';
    return 'gray';
  };

  const roleColor = (r: string | null): string => {
    if (!r) return 'gray';
    if (['owner', 'admin'].includes(r)) return 'purple';
    if (['manager'].includes(r)) return 'blue';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Organization Members" description="Members of this organization" />
      {loading ? (
        <LoadingSpinner label="Loading members..." />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="No members" description="Organization members will appear here." />
      ) : (
        <div className="grid gap-3">
          {members.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Users className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-mono truncate">{m.user_id}</p>
                    <div className="flex gap-2 mt-1">
                      {m.role && <Badge color={roleColor(m.role)}>{m.role}</Badge>}
                      {m.status && <Badge color={statusColor(m.status)}>{m.status}</Badge>}
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
 * List enterprise_branches filtered by organization_id. Read-only.
 * Show: name, branch_code, city, state, status, health_score
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

export function EnterpriseBranchesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<EnterpriseBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enterprise_branches')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (error) {
      showToast('error', `Failed to load branches: ${error.message}`);
    } else {
      setBranches(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['active', 'operational'].includes(s)) return 'green';
    if (['inactive', 'closed'].includes(s)) return 'red';
    if (['maintenance', 'pending'].includes(s)) return 'yellow';
    return 'gray';
  };

  const healthColor = (score: number | null): string => {
    if (score === null) return 'gray';
    if (score >= 80) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
  };

  return (
    <div>
      <PageHeader title="Enterprise Branches" description="Branch locations for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading branches..." />
      ) : branches.length === 0 ? (
        <EmptyState icon={GitBranch} title="No branches" description="Enterprise branches will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branches.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="font-semibold text-white truncate">{b.name}</h3>
                </div>
                {b.status && <Badge color={statusColor(b.status)}>{b.status}</Badge>}
              </div>
              {b.branch_code && <p className="text-xs text-zinc-500 font-mono mb-2">{b.branch_code}</p>}
              <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{[b.city, b.state].filter(Boolean).join(', ') || '—'}</span>
              </div>
              {b.health_score !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Health:</span>
                  <Badge color={healthColor(b.health_score)}>{b.health_score}%</Badge>
                </div>
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
 * List enterprise_regions filtered by organization_id. Read-only.
 * Show: name, region_type, code, status
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

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enterprise_regions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (error) {
      showToast('error', `Failed to load regions: ${error.message}`);
    } else {
      setRegions(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['active'].includes(s)) return 'green';
    if (['inactive', 'archived'].includes(s)) return 'red';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Enterprise Regions" description="Regional groupings for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading regions..." />
      ) : regions.length === 0 ? (
        <EmptyState icon={MapPin} title="No regions" description="Enterprise regions will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {regions.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="font-semibold text-white truncate">{r.name}</h3>
                </div>
                {r.status && <Badge color={statusColor(r.status)}>{r.status}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.region_type && <Badge color="blue">{r.region_type}</Badge>}
                {r.code && <Badge color="purple">{r.code}</Badge>}
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
 * List organization_policies filtered by organization_id. Read-only.
 * Show: policy_key, policy_type, name, description, status
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

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (error) {
      showToast('error', `Failed to load policies: ${error.message}`);
    } else {
      setPolicies(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['active', 'enabled', 'enforced'].includes(s)) return 'green';
    if (['disabled', 'revoked'].includes(s)) return 'red';
    if (['draft', 'pending'].includes(s)) return 'yellow';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Organization Policies" description="Policies configured for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading policies..." />
      ) : policies.length === 0 ? (
        <EmptyState icon={Shield} title="No policies" description="Organization policies will appear here." />
      ) : (
        <div className="grid gap-3">
          {policies.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{p.name}</h3>
                    {p.status && <Badge color={statusColor(p.status)}>{p.status}</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge color="blue">{p.policy_key}</Badge>
                    {p.policy_type && <Badge color="purple">{p.policy_type}</Badge>}
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
