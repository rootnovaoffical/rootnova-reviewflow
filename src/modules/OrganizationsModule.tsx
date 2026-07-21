import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Card,
  Badge,
} from '../components/UI';
import {
  Building2,
  Users,
  GitBranch,
  MapPin,
  Shield,
  Mail,
} from 'lucide-react';

/* ============================================================
 * OrganizationsModule
 * Show single organization record (read-only)
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
    const fetchOrg = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();
      if (error) {
        showToast('error', 'Failed to load organization');
      } else {
        setOrg(data as Organization | null);
      }
      setLoading(false);
    };
    fetchOrg();
  }, [organizationId, showToast]);

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active' || s === 'verified') return 'green';
    if (s === 'suspended' || s === 'deleted') return 'red';
    return 'yellow';
  };

  if (loading) return <LoadingSpinner label="Loading organization..." />;

  if (!org) {
    return (
      <EmptyState
        icon={Building2}
        title="Organization not found"
        description="The organization record could not be loaded"
      />
    );
  }

  return (
    <div>
      <PageHeader title="Organization" description="Organization details" />
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{org.name}</h2>
            <code className="text-sm text-zinc-500 font-mono">{org.slug}</code>
          </div>
          {org.status && <Badge color={statusColor(org.status)}>{org.status}</Badge>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Type</label>
            <p className="text-white font-medium">{org.type || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Contact Email</label>
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-zinc-500" />
              <p className="text-white font-medium">{org.contact_email || '—'}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Slug</label>
            <p className="text-white font-medium font-mono">{org.slug}</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Status</label>
            <p className="text-white font-medium">{org.status || '—'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * OrganizationMembersModule
 * List organization_members filtered by organization_id (read-only)
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
      showToast('error', 'Failed to load members');
    } else {
      setMembers((data as OrganizationMember[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const roleColor = (r: string | null) => {
    if (!r) return 'gray';
    if (r === 'owner' || r === 'admin') return 'purple';
    if (r === 'manager') return 'blue';
    return 'gray';
  };

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active' || s === 'invited') return 'green';
    if (s === 'removed' || s === 'suspended') return 'red';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader title="Organization Members" description="Members of this organization" />

      {loading ? (
        <LoadingSpinner label="Loading members..." />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="No members" description="Organization members will appear here" />
      ) : (
        <div className="grid gap-3">
          {members.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <Users className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium font-mono text-sm">{m.user_id}</p>
                    <div className="flex gap-1.5 mt-1">
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
 * List enterprise_branches filtered by organization_id (read-only)
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
      showToast('error', 'Failed to load branches');
    } else {
      setBranches((data as EnterpriseBranch[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active' || s === 'operational') return 'green';
    if (s === 'closed' || s === 'inactive') return 'red';
    return 'yellow';
  };

  const healthColor = (score: number | null) => {
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
        <EmptyState icon={GitBranch} title="No branches" description="Enterprise branches will appear here" />
      ) : (
        <div className="grid gap-3">
          {branches.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">{b.name}</h3>
                    {b.branch_code && <Badge color="blue">{b.branch_code}</Badge>}
                    {b.status && <Badge color={statusColor(b.status)}>{b.status}</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{[b.city, b.state].filter(Boolean).join(', ') || 'Location not set'}</span>
                  </div>
                  {b.health_score !== null && (
                    <Badge color={healthColor(b.health_score)}>Health: {b.health_score}%</Badge>
                  )}
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
 * EnterpriseRegionsModule
 * List enterprise_regions filtered by organization_id (read-only)
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
      showToast('error', 'Failed to load regions');
    } else {
      setRegions((data as EnterpriseRegion[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active') return 'green';
    if (s === 'inactive' || s === 'archived') return 'red';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader title="Enterprise Regions" description="Regional groupings for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading regions..." />
      ) : regions.length === 0 ? (
        <EmptyState icon={MapPin} title="No regions" description="Enterprise regions will appear here" />
      ) : (
        <div className="grid gap-3">
          {regions.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">{r.name}</h3>
                    {r.code && <Badge color="blue">{r.code}</Badge>}
                    {r.status && <Badge color={statusColor(r.status)}>{r.status}</Badge>}
                  </div>
                  {r.region_type && <p className="text-sm text-zinc-400">Type: {r.region_type}</p>}
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
 * OrganizationPoliciesModule
 * List organization_policies filtered by organization_id (read-only)
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
      showToast('error', 'Failed to load policies');
    } else {
      setPolicies((data as OrganizationPolicy[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active' || s === 'enabled') return 'green';
    if (s === 'disabled' || s === 'archived') return 'red';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader title="Organization Policies" description="Policies configured for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading policies..." />
      ) : policies.length === 0 ? (
        <EmptyState icon={Shield} title="No policies" description="Organization policies will appear here" />
      ) : (
        <div className="grid gap-3">
          {policies.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-zinc-500" />
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    {p.status && <Badge color={statusColor(p.status)}>{p.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {p.policy_key && <Badge color="purple">{p.policy_key}</Badge>}
                    {p.policy_type && <Badge color="blue">{p.policy_type}</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-zinc-400 mt-1">{p.description}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
