import { useEffect, useState, useMemo } from 'react'
import { ScrollText, Loader2, AlertCircle, Filter } from 'lucide-react'
import { listAuditLogs } from '../../lib/db'
import type { AuditLog } from '../../lib/types'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'
import { formatDate } from '../../lib/utils'

export function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let m = true
    ;(async () => { try { const l = await listAuditLogs(); if (m) setLogs(l) } catch (e) { if (m) setError(e instanceof Error ? e.message : 'Failed') } finally { if (m) setLoading(false) } })()
    return () => { m = false }
  }, [])

  const filtered = useMemo(() => logs.filter((l) => !filter || l.action.includes(filter.toUpperCase()) || (l.target_type ?? '').includes(filter.toUpperCase())), [logs, filter])

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <FadeIn><div className="flex items-center gap-2 mb-6"><ScrollText size={22} className="text-brand-400" /><h1 className="text-xl font-bold text-ink-100">Audit Logs</h1></div></FadeIn>
      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}
      <div className="flex items-center gap-2 mb-4"><Filter size={16} className="text-ink-400" /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by action or target..." className="glass-input flex-1 max-w-xs" /></div>
      {filtered.length === 0 ? <div className="glass-card p-8 text-center text-ink-400">No logs found</div> : (
        <StaggerContainer className="space-y-2">
          {filtered.map((l) => (
            <StaggerItem key={l.id} className="glass-card p-3 flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-400 mt-2" />
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium text-ink-100">{l.action}</span>{l.target_type && <span className="text-xs text-ink-400">· {l.target_type}{l.target_id ? `:${l.target_id.slice(0, 8)}` : ''}</span>}</div>{l.metadata && Object.keys(l.metadata).length > 0 && <pre className="text-xs text-ink-400 mt-1 overflow-x-auto bg-ink-700/30 rounded p-2">{JSON.stringify(l.metadata)}</pre>}<div className="text-xs text-ink-500 mt-1">{formatDate(l.created_at)}</div></div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
