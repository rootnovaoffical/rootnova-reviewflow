import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Payment } from "../../lib/types";
import { Loading, ErrorState } from "../../components/States";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { useToast } from "../../context/ToastContext";
import { insertAuditLog } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import { getSignedUrl } from "../../lib/storage";

export default function AdminPaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    supabase.from("payments").select("*").eq("id", id).single().then(({ data }) => {
      setPayment(data as Payment);
      setLoading(false);
      if (data?.screenshot_path) getSignedUrl(data.screenshot_path).then(setProofUrl);
    });
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status: "UNDER_REVIEW" | "APPROVED" | "REJECTED", reason?: string) => {
    if (!payment || !profile) return;
    const updates: Record<string, unknown> = { status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() };
    if (status === "APPROVED") { updates.approved_by = profile.id; updates.approved_at = new Date().toISOString(); }
    if (status === "REJECTED" && reason) updates.rejection_reason = reason;
    const { error } = await supabase.from("payments").update(updates).eq("id", payment.id);
    if (error) { showToast("Failed to update payment", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: `payment_${status.toLowerCase()}`, target_type: "payment", target_id: payment.id, organization_id: payment.organization_id, metadata: { amount: payment.amount, reason } });
    showToast(`Payment ${status.toLowerCase()}`, "success");
    load();
  };

  if (loading) return <Layout title="Payment"><Loading /></Layout>;
  if (!payment) return <Layout title="Payment"><ErrorState message="Payment not found" /></Layout>;

  return (
    <Layout title={`Payment ${formatCurrency(payment.amount)}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Payment Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="text-white font-medium">{formatCurrency(payment.amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Purpose</dt><dd className="text-white">{payment.payment_purpose}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Method</dt><dd className="text-white">{payment.payment_method}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">UPI ID</dt><dd className="text-white">{payment.upi_id || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">UTR Reference</dt><dd className="text-white">{payment.utr_reference || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><span className={`px-2 py-1 rounded-full text-xs ${payment.status === "APPROVED" ? "bg-success-500/20 text-success-400" : payment.status === "REJECTED" ? "bg-error-500/20 text-error-400" : payment.status === "UNDER_REVIEW" ? "bg-warning-500/20 text-warning-400" : "bg-slate-500/20 text-slate-400"}`}>{payment.status}</span></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-white">{formatDateTime(payment.created_at)}</dd></div>
            {payment.rejection_reason && <div className="flex justify-between"><dt className="text-slate-500">Rejection Reason</dt><dd className="text-error-400">{payment.rejection_reason}</dd></div>}
          </dl>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Proof Screenshot</h3>
          {proofUrl ? <img src={proofUrl} alt="Payment proof" className="w-full rounded-xl mb-4" /> : <p className="text-slate-500 text-sm">No proof uploaded</p>}
          {payment.status === "PENDING" && (
            <button onClick={() => updateStatus("UNDER_REVIEW")} className="w-full py-2 bg-warning-600 hover:bg-warning-500 text-white text-sm font-medium rounded-lg mb-2 transition-colors">Mark Under Review</button>
          )}
          {payment.status !== "APPROVED" && (
            <button onClick={() => updateStatus("APPROVED")} className="w-full py-2 bg-success-600 hover:bg-success-500 text-white text-sm font-medium rounded-lg mb-2 transition-colors">Approve Payment</button>
          )}
          {payment.status !== "REJECTED" && (
            <div>
              {showReject ? (
                <div>
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm mb-2" />
                  <button onClick={() => { updateStatus("REJECTED", rejectReason); setShowReject(false); setRejectReason(""); }} className="w-full py-2 bg-error-600 hover:bg-error-500 text-white text-sm font-medium rounded-lg transition-colors">Confirm Reject</button>
                </div>
              ) : (
                <button onClick={() => setShowReject(true)} className="w-full py-2 bg-error-600/80 hover:bg-error-500 text-white text-sm font-medium rounded-lg transition-colors">Reject Payment</button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
