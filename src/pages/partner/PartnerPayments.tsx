import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { useToast } from "../../components/Toast";
import { formatCurrency, timeAgo } from "../../lib/utils";
import type { Payment } from "../../lib/types";

export function PartnerPayments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: "", upi_id: "", utr_reference: "", payment_date: "" });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const load = async (oid: string) => {
    const { data, error } = await supabase.from("payments").select("*").eq("organization_id", oid).order("created_at", { ascending: false });
    if (error) setError(error.message); else setPayments((data as Payment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      const oid = (member as any)?.organization_id;
      setOrgId(oid);
      if (!oid) { setError("No organization found"); setLoading(false); return; }
      load(oid);
    })();
  }, [profile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!form.amount || !form.upi_id || !form.payment_date) { toast("Amount, UPI ID, and payment date are required", "error"); return; }
    setSubmitting(true);
    let screenshotPath: string | null = null;
    if (screenshotFile) {
      const path = `proofs/${orgId}/${Date.now()}-${screenshotFile.name}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, screenshotFile, { contentType: screenshotFile.type });
      if (upErr) { toast(upErr.message, "error"); setSubmitting(false); return; }
      screenshotPath = path;
    }
    const { error } = await supabase.from("payments").insert({ organization_id: orgId, amount: parseFloat(form.amount), payment_purpose: "SUBSCRIPTION", payment_method: "UPI", upi_id: form.upi_id, utr_reference: form.utr_reference || null, payment_date: form.payment_date, screenshot_path: screenshotPath, status: "PENDING", submitted_by: profile?.id });
    if (error) toast(error.message, "error");
    else { toast("Payment submitted for review", "success"); setForm({ amount: "", upi_id: "", utr_reference: "", payment_date: "" }); setScreenshotFile(null); load(orgId); }
    setSubmitting(false);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Payments</h1><p className="mt-1 text-sm text-ink-400">Submit payment proofs and track approval</p></div>
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink-50">Submit New Payment</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Amount (₹)</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div><label className="label">Payment Date</label><input type="date" className="input" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required /></div>
          <div><label className="label">UPI ID</label><input className="input" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} required /></div>
          <div><label className="label">UTR Reference</label><input className="input" value={form.utr_reference} onChange={(e) => setForm({ ...form, utr_reference: e.target.value })} /></div>
        </div>
        <div><label className="label">Payment Screenshot</label><input type="file" accept="image/*" className="input" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} /></div>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit Payment"}</button>
      </form>
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-50">Payment History</h2>
        {payments.length === 0 ? <EmptyState title="No payments yet" subtitle="Submit your first payment using the form above." /> : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="card flex items-center justify-between">
                <div><p className="font-medium text-ink-50">{formatCurrency(p.amount)}</p><p className="text-sm text-ink-400">{p.upi_id} · {p.payment_date}</p></div>
                <div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" : p.status === "PENDING" || p.status === "UNDER_REVIEW" ? "bg-amber-500/15 text-amber-300" : p.status === "REJECTED" ? "bg-red-500/15 text-red-300" : "bg-ink-700 text-ink-400"}`}>{p.status.replace("_", " ")}</span><span className="text-xs text-ink-400">{timeAgo(p.created_at)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
