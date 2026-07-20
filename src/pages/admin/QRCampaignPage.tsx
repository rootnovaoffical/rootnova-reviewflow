import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Copy, Check, ArrowLeft, QrCode as QrIcon } from 'lucide-react'
import { getBusinessById } from '../../lib/db'
import { publicReviewUrl, copyToClipboard } from '../../lib/utils'
import type { Business } from '../../lib/types'
import { FadeIn } from '../../components/Animations'

export function QRCampaignPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<Business | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try { const biz = await getBusinessById(id); if (mounted) setBusiness(biz) } catch { /* ignore */ }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>
  if (!business) return <div className="p-8 text-error-400">Business not found</div>

  const url = publicReviewUrl(business.slug)

  const handleCopy = async () => {
    await copyToClipboard(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const svg = document.querySelector('#qr-code-svg') as SVGSVGElement | null
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      canvas.width = 512; canvas.height = 512
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      const link = document.createElement('a')
      link.download = `${business.slug}-qr.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <FadeIn>
        <button onClick={() => navigate(`/admin/business/${business.id}`)} className="btn-secondary mb-4 flex items-center gap-2 text-sm"><ArrowLeft size={16} /> Back to {business.name}</button>
        <div className="flex items-center gap-2 mb-6"><QrIcon size={22} className="text-brand-400" /><h1 className="text-xl font-bold text-ink-100">QR Campaign Center</h1></div>
        <div className="glass-card p-6">
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-2xl mb-4 shadow-lg">
              <QRCodeSVG id="qr-code-svg" value={url} size={240} level="M" bgColor="#ffffff" fgColor="#0a0a0f" />
            </div>
            <div className="w-full">
              <div className="bg-ink-700/40 rounded-xl px-4 py-3 mb-3 border border-ink-600/40">
                <div className="text-xs text-ink-400 mb-1">Review URL</div>
                <div className="text-sm text-ink-100 font-mono break-all">{url}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2"><Download size={16} /> Download PNG</button>
                <button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-2">{copied ? <Check size={16} className="text-success-400" /> : <Copy size={16} />}{copied ? 'Copied!' : 'Copy URL'}</button>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-ink-600/30">
            <h3 className="text-sm font-semibold text-ink-200 mb-2">Campaign Tips</h3>
            <ul className="text-xs text-ink-400 space-y-1.5">
              <li>Print the QR code on receipts, table tents, or business cards</li>
              <li>Place it near the checkout counter for easy scanning</li>
              <li>Add it to your email signature or social media bios</li>
              <li>The QR code links directly to your branded review page</li>
            </ul>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}
