import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, UserPlus, Users, Building2, AlertCircle, Loader2, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isRootNovaAdmin } from '../../lib/auth-api'
import { listProfiles, listBusinesses, listAdminInvitations, updateProfileStatus } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import type { Profile, Business, AdminInvitation, UserRole } from '../../lib/types'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'

export function AdminGovernancePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [invitations, setInvitations] = useState<AdminInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('BUSINESS_ADMIN')
  const [inviteBusinessId, setInviteBusinessId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    if (!isRootNovaAdmin(profile)) { navigate('/admin/dashboard'); return }
    let mounted = true
    ;(async () => {
      try {
        const [p, b, inv] = await Promise.all([listProfiles(), listBusinesses(), listAdminInvitations().catch(() => [] as AdminInvitation[])])
        if (!mounted) return
        setProfiles(p); setBusinesses(b); setInvitations(inv)
      } catch (e) { if (mounted) setError(e instanceof Error ? e.message : 'Failed to load') }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [profile, navigate])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true); setError(null)
    try {
      const EDGE_URL = import.meta.env.VITE_SUPABASE_URL as string
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${EDGE_URL}/functions/v1/manage-admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, business_id: inviteRole === 'BUSINESS_ADMIN' ? inviteBusinessId : null }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Failed' })); throw new Error(err.error || 'Invite failed') }
      const updated = await listAdminInvitations().catch(() => [] as AdminInvitation[])
      setInvitations(updated); setInviteEmail(''); setInviteSuccess(true); setTimeout(() => setInviteSuccess(false), 2000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Invite failed') }
    finally { setInviting(false) }
  }

  const handleStatusChange = async (userId: string, status: string) => {
    try { await updateProfileStatus(userId, status); setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, account_status: status as Profile['account_status'] } : p))) }
    catch (e) { setError(e instanceof Error ? e.message : 'Status update failed') }
  }

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <FadeIn><div className="flex items-center gap-2 mb-6"><Shield size={22} className="text-brand-400" /><h1 className="text-xl font-bold text-ink-100">Admin Governance</h1></div></FadeIn>
      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FadeIn delay={0.05} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4"><UserPlus size={18} className="text-brand-400" /><h3 className="text-sm font-semibold text-ink-200">Invite Admin</h3></div>
          <form onSubmit={handleInvite} className="space-y-3">
            <div><label className="text-xs text-ink-400 mb-1 block">Email</label><input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="glass-input w-full" placeholder="admin@business.com" /></div>
            <div><label className="text-xs text-ink-400 mb-1 block">Role</label><select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className="glass-input w-full"><option value="BUSINESS_ADMIN">Business Admin</option><option value="ROOTNOVA_ADMIN">RootNova Admin (super)</option></select></div>
            {inviteRole === 'BUSINESS_ADMIN' && (
              <div><label className="text-xs text-ink-400 mb-1 block">Assign to Business</label><select value={inviteBusinessId} onChange={(e) => setInviteBusinessId(e.target.value)} className="glass-input w-full"><option value="">Select business...</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            )}
            <button type="submit" disabled={inviting} className="btn-primary w-full flex items-center justify-center gap-2">{inviteSuccess ? <Check size={16} /> : inviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}{inviteSuccess ? 'Invited!' : inviting ? 'Inviting...' : 'Send Invitation'}</button>
          </form>
        </FadeIn>
        <FadeIn delay={0.1} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-brand-400" /><h3 className="text-sm font-semibold text-ink-200">Account Overview</h3></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-ink-700/30 rounded-xl p-3"><div className="text-xs text-ink-400">Total Users</div><div className="text-xl font-bold text-ink-100">{profiles.length}</div></div>
            <div className="bg-ink-700/30 rounded-xl p-3"><div className="text-xs text-ink-400">Businesses</div><div className="text-xl font-bold text-ink-100">{businesses.length}</div></div>
            <div className="bg-ink-700/30 rounded-xl p-3"><div className="text-xs text-ink-400">RootNova Admins</div><div className="text-xl font-bold text-ink-100">{profiles.filter((p) => p.role === 'ROOTNOVA_ADMIN').length}</div></div>
            <div className="bg-ink-700/30 rounded-xl p-3"><div className="text-xs text-ink-400">Business Admins</div><div className="text-xl font-bold text-ink-100">{profiles.filter((p) => p.role === 'BUSINESS_ADMIN').length}</div></div>
          </div>
        </FadeIn>
      </div>
      <FadeIn delay={0.15} className="glass-card p-5 mt-4">
        <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-brand-400" /><h3 className="text-sm font-semibold text-ink-200">User Accounts</h3></div>
        <StaggerContainer className="space-y-2">
          {profiles.map((p) => (
            <StaggerItem key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-700/30 border border-ink-600/30">
              <div className="min-w-0 flex-1"><div className="text-sm font-medium text-ink-100 truncate">{p.full_name}</div><div className="text-xs text-ink-400 truncate">{p.email}</div></div>
              <div className="flex items-center gap-2">
                <span className={`badge ${p.role === 'ROOTNOVA_ADMIN' ? 'bg-brand-500/15 text-brand-300' : 'bg-accent-500/15 text-accent-400'}`}>{p.role === 'ROOTNOVA_ADMIN' ? 'Super Admin' : 'Business'}</span>
                {p.id !== profile?.id && <select value={p.account_status ?? 'ACTIVE'} onChange={(e) => handleStatusChange(p.id, e.target.value)} className="glass-input text-xs py-1 px-2"><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DEACTIVATED">Deactivated</option></select>}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </FadeIn>
      {invitations.length > 0 && (
        <FadeIn delay={0.2} className="glass-card p-5 mt-4">
          <div className="flex items-center gap-2 mb-4"><Building2 size={18} className="text-brand-400" /><h3 className="text-sm font-semibold text-ink-200">Pending Invitations</h3></div>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-700/30 border border-ink-600/30">
                <div><div className="text-sm font-medium text-ink-100">{inv.email}</div><div className="text-xs text-ink-400">{inv.role === 'ROOTNOVA_ADMIN' ? 'Super Admin' : 'Business Admin'}{inv.business_id && ` · ${businesses.find((b) => b.id === inv.business_id)?.name ?? ''}`}</div></div>
                <span className="badge bg-warning-500/15 text-warning-400">{inv.status}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      )}
    </div>
  )
}
