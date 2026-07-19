import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { useToast } from "../../context/ToastContext";
import { logAudit } from "../../lib/audit";
import { getSignedPaymentProof } from "../../lib/storage";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import type { Payment } from "../../lib/types";

export default function SuperAdminPaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejection, setRejection] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("payments").select("*, organizations(name), plans(name), profiles!payments_submitted_by_fkey(full_name, email)").eq("id", id).maybeSingle();
    setPayment(data as Payment | null);
    if ((data as Payment)?.screenshot_path) { const url = await getSignedPaymentProof((data as Payment).screenshot_path!); setProofUrl(url); }
  };
  useEffect(() => { load(); }, [id]);
  const setStatus = async (status: "APPROVED" | "REJECTED" | "UNDER_REVIEW") => {
    setBusy(true);
    const updates: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
    if (status === "REJECTED") updates.rejection_reason = rejection;
    if (status === "APPROVED") updates.approved_at = new Date().toISOString();
    const { error } = await supabase.from("payments").update(updates).eq("id", id!);
    setBusy(false);
    if (error) { show("Failed", "error"); return; }
    await logAudit("payment.status_change", "payment", id!, null, { status, reason: rejection });
    show(`Payment ${status.toLowerCase()}`, "success"); setRejection(""); load();
  };
  if (!payment) return <div className="p-8 text-slate-400">Loading…</div>;
  return (
    <div>
      <PageHeader title={`Payment ${formatCurrency(payment.amount)}`} subtitle={`UTR: ${payment.utr_reference || "—"}`} />
      <div className="p-8 grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-semibold mb-4">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Organization</dt><dd className="text-white">{(payment as { organizations?: { name?: string } }).organizations?.name || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Plan</dt><dd className="text-white">{(payment as { plans?: { name?: string } }).plans?.name || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Amount</dt><dd className="text-white">{formatCurrency(payment.amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Method</dt><dd className="text-white">{payment.payment_method || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">UPI ID</dt><dd className="text-white">{payment.upi_id || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">UTR</dt><dd className="text-white">{payment.utr_reference || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Submitted</dt><dd className="text-white">{formatDateTime(payment.created_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd><Badge color={payment.status === "APPROVED" ? "green" : payment.status === "REJECTED" ? "red" : "amber"}>{payment.status}</Badge></dd></div>
            {payment.rejection_reason && <div className="text-rose-300 text-xs pt-2">Reason: {payment.rejection_reason}</div>}
          </dl>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">Payment proof</h3>
          {proofUrl ? <a href={proofUrl} target="_blank" rel="noreferrer"><img src={proofUrl} alt="Payment proof" className="rounded-xl max-w-full" /></a> : <p className="text-slate-500 text-sm">No proof uploaded.</p>}
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">Review actions</h3>
          <div className="space-y-3">
            <textarea value={rejection} onChange={(e) => setRejection(e.target.value)} placeholder="Rejection reason (if rejecting)" rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setStatus("UNDER_REVIEW")} disabled={busy} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm">Mark under review</button>
              <button onClick={() => setStatus("APPROVED")} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm">Approve</button>
              <button onClick={() => setStatus("REJECTED")} disabled={busy} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm">Reject</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
