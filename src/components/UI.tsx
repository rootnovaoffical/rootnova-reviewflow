import { useState } from 'react';
import { Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

export function SpatialBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-zinc-950">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[100px]" />
      <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-emerald-500/3 blur-[80px]" />
    </div>
  );
}
export function LoadingSpinner({ label }: { label?: string }) {
  return (<div className="flex flex-col items-center justify-center py-16"><Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />{label && <p className="text-sm text-zinc-500">{label}</p>}</div>);
}
export function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Loader2; title: string; description?: string; action?: ReactNode }) {
  return (<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-zinc-600" /></div><h3 className="text-lg font-semibold text-white mb-1">{title}</h3>{description && <p className="text-sm text-zinc-500 max-w-sm mb-4">{description}</p>}{action}</div>);
}
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6"><div><h2 className="text-xl font-bold text-white">{title}</h2>{description && <p className="text-sm text-zinc-400 mt-0.5">{description}</p>}</div>{action}</div>);
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white/5 border border-white/10 ${className}`}>{children}</div>;
}
export function Badge({ children, color = 'blue' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-500/15 text-blue-300 border-blue-400/20', green: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20', red: 'bg-red-500/15 text-red-300 border-red-400/20', yellow: 'bg-amber-500/15 text-amber-300 border-amber-400/20', gray: 'bg-zinc-500/15 text-zinc-300 border-zinc-400/20', purple: 'bg-violet-500/15 text-violet-300 border-violet-400/20' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.blue}`}>{children}</span>;
}
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className = '' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; disabled?: boolean; className?: string }) {
  const variants: Record<string, string> = { primary: 'bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30', secondary: 'bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10', danger: 'bg-red-500/20 border border-red-400/30 text-red-200 hover:bg-red-500/30', ghost: 'text-zinc-400 hover:bg-white/5 hover:text-white' };
  const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>{children}</button>;
}
export function Input({ value, onChange, placeholder, type = 'text', className = '' }: { value: string; onChange: (val: string) => void; placeholder?: string; type?: string; className?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-400/50 transition-colors ${className}`} />;
}
export function TextArea({ value, onChange, placeholder, rows = 3, className = '' }: { value: string; onChange: (val: string) => void; placeholder?: string; rows?: number; className?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-400/50 transition-colors resize-none ${className}`} />;
}
export function Select({ value, onChange, children, className = '' }: { value: string; onChange: (val: string) => void; children: ReactNode; className?: string }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400/50 transition-colors ${className}`}>{children}</select>;
}
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: string }) {
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} /><div className={`relative w-full ${maxWidth} rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up`}><div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-zinc-900 z-10"><h3 className="text-lg font-semibold text-white">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button></div><div className="p-5">{children}</div></div></div>);
}
export function StatCard({ label, value, icon: Icon, color = 'blue' }: { label: string; value: string | number; icon: typeof Loader2; color?: string }) {
  const colors: Record<string, string> = { blue: 'text-blue-400 bg-blue-500/10', green: 'text-emerald-400 bg-emerald-500/10', red: 'text-red-400 bg-red-500/10', yellow: 'text-amber-400 bg-amber-500/10', purple: 'text-violet-400 bg-violet-500/10' };
  return (<Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-zinc-500 mb-1">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div></div></Card>);
}
export function ImageUpload({ onUpload, currentUrl, label, bucket, folderId }: { onUpload: (url: string) => void; currentUrl: string | null; label: string; bucket: 'avatars' | 'business-logos'; folderId: string }) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('error', 'File too large (max 5MB)'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${folderId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUpload(data.publicUrl);
      showToast('success', 'Image uploaded successfully');
    } catch (err) {
      showToast('error', `Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-200 mb-1">{label}</p>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          {currentUrl ? 'Change' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

export default SpatialBackground;
