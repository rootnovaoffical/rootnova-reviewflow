import { useEffect, useState, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { QRCode as QRCodeRow, QRType, Business } from "../../lib/types";
import { SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { insertAuditLog } from "../../lib/auth";
import { useQRCode, downloadQR } from "../../lib/qr";
import { publicReviewUrl } from "../../lib/business";
import { timeAgo } from "../../lib/utils";

const QR_TYPE_META: Record<QRType, { label: string; icon: string; hint: string }> = {
  reviewflow: { label: "ReviewFlow", icon: "\u2B50", hint: "Sends customers to your review experience" },
  menu: { label: "Menu", icon: "\uD83C\uDF7B", hint: "Links to your digital menu" },
  whatsapp: { label: "WhatsApp", icon: "\uD83D\uDCAC", hint: "Opens a WhatsApp chat" },
  website: { label: "Website", icon: "\uD83C\uDF10", hint: "Directs to any web page" },
  campaign: { label: "Campaign", icon: "\uD83D\uDCE2", hint: "Track a specific marketing push" },
  custom: { label: "Custom", icon: "\u2728", hint: "Any destination you choose" },
};

export default function BusinessQRCodes() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCodeRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QRCodeRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QRCodeRow | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setLoading(false); return; }
      setBusinessId(link.business_id);

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", link.business_id)
        .maybeSingle();
      if (bizErr) throw bizErr;
      setBusiness(biz as Business);

      const { data: codes, error: qrErr } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("business_id", link.business_id)
        .order("created_at", { ascending: false });
      if (qrErr) throw qrErr;
      setQrCodes((codes || []) as QRCodeRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load QR codes");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: { id?: string; name: string; qr_type: QRType; destination_url: string; status: "active" | "inactive" }) => {
    if (!businessId || !profile) return;
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabase.from("qr_codes").update(rest).eq("id", id);
      if (error) { showToast("Failed to update QR code", "error"); return; }
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "qr_code_updated", target_type: "qr_code", target_id: id });
      showToast("QR code updated", "success");
    } else {
      const { error } = await supabase.from("qr_codes").insert({ ...data, business_id: businessId });
      if (error) { showToast("Failed to create QR code", "error"); return; }
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "qr_code_created", target_type: "qr_code" });
      showToast("QR code created", "success");
    }
    setEditing(null);
    setCreating(false);
    load();
  };

  const toggleStatus = async (qr: QRCodeRow) => {
    const newStatus = qr.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("qr_codes").update({ status: newStatus }).eq("id", qr.id);
    if (error) { showToast("Failed to update status", "error"); return; }
    if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "qr_code_toggled", target_type: "qr_code", target_id: qr.id });
    showToast(newStatus === "active" ? "QR code activated" : "QR code deactivated", "success");
    load();
  };

  const handleDelete = async () => {
    if (!confirmDelete || !profile) return;
    const { error } = await supabase.from("qr_codes").delete().eq("id", confirmDelete.id);
    if (error) { showToast("Failed to delete QR code", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "qr_code_deleted", target_type: "qr_code", target_id: confirmDelete.id });
    showToast("QR code deleted", "success");
    setConfirmDelete(null);
    load();
  };

  if (loading) return (
    <BusinessShell title="QR Codes">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-end"><div className="shimmer-card rounded-xl h-10 w-36" /></div>
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="QR Codes">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (!businessId) return (
    <BusinessShell title="QR Codes">
      <div className="p-4 md:p-8"><EmptyState title="No business assigned" subtitle="Contact support to set up your business profile." /></div>
    </BusinessShell>
  );

  const activeCount = qrCodes?.filter((q) => q.status === "active").length ?? 0;
  const totalScans = qrCodes?.reduce((s, q) => s + q.scan_count, 0) ?? 0;

  return (
    <BusinessShell title="QR Codes">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">QR Command Center</h2>
            <p className="text-sm text-slate-400 mt-1">Create and manage QR codes that connect customers to your business.</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap">
            + New QR Code
          </button>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="glass rounded-2xl p-4 card-hover">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total QR Codes</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">{qrCodes?.length ?? 0}</p>
          </div>
          <div className="glass rounded-2xl p-4 card-hover">
            <p className="text-xs uppercase tracking-wide text-slate-400">Active</p>
            <p className="text-2xl font-bold text-success-400 mt-1 tabular-nums">{activeCount}</p>
          </div>
          <div className="glass rounded-2xl p-4 card-hover">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Scans</p>
            <p className="text-2xl font-bold text-primary-300 mt-1 tabular-nums">{totalScans}</p>
          </div>
        </div>

        {/* QR code grid */}
        {(!qrCodes || qrCodes.length === 0) ? (
          <div className="glass rounded-2xl p-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <EmptyState
              title="No QR codes yet"
              subtitle="Create your first QR code to start connecting with customers."
              action={
                <button onClick={() => setCreating(true)} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">
                  Create Your First QR
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrCodes.map((qr, i) => (
              <QRCard
                key={qr.id}
                qr={qr}
                delay={i * 60}
                onEdit={() => setEditing(qr)}
                onToggle={() => toggleStatus(qr)}
                onDelete={() => setConfirmDelete(qr)}
              />
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <QRModal
          qr={editing}
          business={business}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          qr={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </BusinessShell>
  );
}

function QRCard({ qr, delay, onEdit, onToggle, onDelete }: {
  qr: QRCodeRow;
  delay: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const qrUrl = useQRCode(qr.destination_url);
  const meta = QR_TYPE_META[qr.qr_type] || QR_TYPE_META.custom;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qr.destination_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (qrUrl) downloadQR(qrUrl, `${qr.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`);
  };

  return (
    <div className="glass rounded-2xl p-5 card-hover animate-fade-up flex flex-col" style={{ animationDelay: `${delay}ms` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0">{meta.icon}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{qr.name}</p>
            <p className="text-xs text-slate-500">{meta.label}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${qr.status === "active" ? "bg-success-500/20 text-success-400" : "bg-slate-600/30 text-slate-400"}`}>
          {qr.status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      {/* QR preview */}
      <div className="flex justify-center mb-4">
        {qrUrl ? (
          <img src={qrUrl} alt={`QR code for ${qr.name}`} className="w-32 h-32 rounded-xl border border-white/10" />
        ) : (
          <div className="w-32 h-32 rounded-xl bg-slate-800 animate-pulse" />
        )}
      </div>

      {/* Destination */}
      <div className="mb-4 flex-1">
        <p className="text-xs text-slate-500 mb-1">Destination</p>
        <p className="text-xs text-slate-300 break-all line-clamp-2">{qr.destination_url}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="text-slate-500">{qr.scan_count} scans</span>
        <span className="text-slate-600">{"\u2022"}</span>
        <span className="text-slate-500">{timeAgo(qr.created_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={handleDownload} disabled={!qrUrl} className="btn-ghost px-3 py-2 text-xs rounded-lg disabled:opacity-40">Download</button>
        <button onClick={handleCopy} className={`btn-ghost px-3 py-2 text-xs rounded-lg ${copied ? "copy-success" : ""}`}>{copied ? "\u2713 Copied" : "Copy Link"}</button>
        <button onClick={onToggle} className="btn-ghost px-3 py-2 text-xs rounded-lg">{qr.status === "active" ? "Deactivate" : "Activate"}</button>
        <button onClick={onEdit} className="btn-ghost px-3 py-2 text-xs rounded-lg">Edit</button>
        <button onClick={onDelete} className="px-3 py-2 text-xs text-error-400 hover:bg-error-500/10 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

function QRModal({ qr, business, onClose, onSave }: {
  qr: QRCodeRow | null;
  business: Business | null;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; qr_type: QRType; destination_url: string; status: "active" | "inactive" }) => void;
}) {
  const [form, setForm] = useState({
    name: qr?.name || "",
    qr_type: (qr?.qr_type || "reviewflow") as QRType,
    destination_url: qr?.destination_url || (business ? publicReviewUrl(business.slug) : ""),
    status: qr?.status || "active",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.destination_url.trim()) return;
    setSaving(true);
    await onSave({ ...form, id: qr?.id });
    setSaving(false);
  };

  const isReviewFlow = form.qr_type === "reviewflow";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">{qr ? "Edit QR Code" : "New QR Code"}</h2>
        <p className="text-sm text-slate-400 mb-5">{qr ? "Update your QR code details." : "Create a QR code that connects customers to your business."}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">QR Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Front Desk, Table Tent, Window Display"
              className="input-field w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">QR Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(QR_TYPE_META) as QRType[]).map((type) => {
                const m = QR_TYPE_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => {
                      const newUrl = type === "reviewflow" && business ? publicReviewUrl(business.slug) : form.destination_url;
                      setForm((f) => ({ ...f, qr_type: type, destination_url: newUrl }));
                    }}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs transition-all ${
                      form.qr_type === type
                        ? "border-primary-500/50 bg-primary-500/15 text-white"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{QR_TYPE_META[form.qr_type].hint}</p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Destination URL</label>
            <input
              value={form.destination_url}
              onChange={(e) => setForm((f) => ({ ...f, destination_url: e.target.value }))}
              placeholder="https://..."
              className="input-field w-full"
              readOnly={isReviewFlow && !!business}
            />
            {isReviewFlow && business && (
              <p className="text-xs text-primary-400 mt-1.5">This QR links to your public review page. You can change it in My Business.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.status === "active"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "active" : "inactive" }))}
            />
            Active (customers can scan this QR)
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim() || !form.destination_url.trim()}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : qr ? "Save Changes" : "Create QR Code"}
          </button>
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ qr, onCancel, onConfirm }: {
  qr: QRCodeRow;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">Delete QR Code?</h3>
        <p className="text-sm text-slate-400 mb-6">"{qr.name}" will be permanently removed. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white bg-rose-600 hover:bg-rose-700 transition-colors">Delete</button>
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}
