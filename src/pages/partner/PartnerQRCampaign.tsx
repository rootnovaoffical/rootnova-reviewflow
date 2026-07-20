import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, Download, AlertCircle, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getBusinessById } from '../../lib/db'
import type { Business } from '../../lib/types'
import { FadeIn } from '../../components/Animations'
import { copyToClipboard } from '../../lib/utils'

export function PartnerQRCampaign() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    let m = true
    ;(async () => { try { const b = await getBusinessById(id); if (m) setBusiness(b) } catch (e) { if (m) setError(e instanceof Error ? e.message : 'Failed') } finally { if (m) setLoading(false) } })()
    return () => { m = false }
  }, [id])

  const publicUrl = useMemo(() => business ? `${window.location.origin}/r/${business.slug}` : '', [business])

  const handleCopy = async () => { await copyToClipboard(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg')
    if (!svg) return
    const data = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${business?.slug ?? 'qr'}.svg`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>
  if (!business) return <div className="p-8 text-center text-ink-400">Business not found</div>

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <FadeIn><button onClick={() => navigate(`/partner/businesses/${business.id}`)} className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-200 mb-4"><ArrowLeft size={16} /> Back to {business.name}</button></FadeIn>
      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}
      <FadeIn delay={0.05}><div className="flex items-center gap-2 mb-6"><QrCode size={22} className="text-brand-400" /><h1 className="text-xl font-bold text-ink-100">QR Campaign — {business.name}</h1></div></FadeIn>
      <FadeIn delay={0.1} className="glass-card p-8 flex flex-col items-center">
        <div className="bg-white p-6 rounded-2xl mb-4"><QRCodeSVG id="qr-svg" value={publicUrl} size={240} level="M" /></div>
        <div className="text-sm text-ink-200 font-medium mb-1">{business.name}</div>
        <div className="text-xs text-ink-400 mb-4">{publicUrl}</div>
        <div className="flex gap-2"><button onClick={handleCopy} className="btn-secondary flex items-center gap-2 text-sm">{copied ? <Check size={16} className="text-success-400" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy URL'}</button><button onClick={handleDownload} className="btn-primary flex items-center gap-2 text-sm"><Download size={16} /> Download SVG</button></div>
      </FadeIn>
      <FadeIn delay={0.15} className="glass-card p-5 mt-4"><h3 className="text-sm font-semibold text-ink-200 mb-2">How to use</h3><ol className="text-xs text-ink-400 space-y-1 list-decimal list-inside"><li>Download the QR code SVG above</li><li>Print on table tents, receipts, or signage</li><li>Customers scan to reach your review page at /r/{business.slug}</li><li>Track scans and reviews from your dashboard</li></ol></FadeIn>
    </div>
  )
}
