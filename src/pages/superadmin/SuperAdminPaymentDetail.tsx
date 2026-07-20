import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState } from "../../components/States";
import { useToast } from "../../components/Toast";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import type { Payment } from "../../lib/types";

export function SuperAdminPaymentDetail() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { toast } = useToast();
  const [payment, setPayment] = useState<(Payment & { organization: any; plan: any }) | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!paymentId) return;
    const { data, error } = await supabase
      .from("payments")
      .select("*, organization:organizations!payments_organization_id_fkey(name), plan:plans(*)")
      .eq("id", paymentId)
      .maybeSingle();
    if (error || !data) { setError("Payment not found"); setLoading(false); return; }
    setPayment(data as any);
    if ((data as any).screenshot_path) {
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl((data as any).screenshot_path, 3600);
      if (signed) setScreenshotUrl(signed.signedUrl);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [paymentId]);

  const handleApprove = async () => {
    if (!payment || !paymentId) return;
    setActing(true);
    const { data: userData } = await supabase.auth.getUser();
    const reviewerId = userData.user?.id;
    if (!reviewerId) { toast("Authentication error", "error"); setActing(false); return; }
    const { data, error } = await supabase.rpc("approve_payment_and_activate_subscription", {
      p_payment_id: paymentId,
      p_reviewer_id: reviewerId,
    });
    if (error) { toast(error.message, "error"); }
    else if (data && data.success === false) { toast(data.error || "Approval failed", "error"); }
    else { toast("Payment approved and subscription activated", "success"); load(); }
    setActing(false);
  };

  const handleReject = async () => {
    if (!payment || !paymentId) return;
    if (!rejectReason.trim()) { toast("Rejection reason required", "error"); return; }
    setActing(true);
    const { data: userData } = await supabase.auth.getUser();
    const reviewerId = userData.user?.id;
    if (!reviewerId) { toast("Authentication error", "error"); setActing(false); return; }
    const { data, error } = await supabase.rpc("reject_payment", {
      p_payment_id: paymentId,
      p_reviewer_id: reviewerId,
      p_reason: rejectReason.trim(),
    });
    if (error) { toast(error.message, "error"); }
    else if (data && data.success === false) { toast(data.error || "Rejection failed", "error"); }
    else { toast("Payment rejected", "success"); setShowReject(false); setRejectReason(""); load(); }
    setActing(false);
  };

  const markUnderReview = async () => {
    if (!payment || !paymentId) return;
    setActing(true);
    const { data: userData } = await supabase.auth.getUser();
    const reviewerId = userData.user?.id;
    if (!reviewerId) { toast("Authentication error", "error"); setActing(false); return; }
    const { error } = await supabase.from("payments").update({ status: "UNDER_REVIEW", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) toast(error.message, "error"); else { toast("Marked under review", "success"); load(); }
    setActing(false);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!payment) return <ErrorState message="Payment not found" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/superadmin/payments" className="text-ink-400 hover:text-ink-100">←</Link>
        <h1 className="font-display text-2xl font-bold text-ink-50">{formatCurrency(payment.amount)}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payment.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" : payment.status === "PENDING" || payment.status === "UNDER_REVIEW" ? "bg-amber-500/15 text-amber-300" : "bg-red-500/15 text-red-300"}`}>{payment.status.replace("_", " ")}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card"><p className="label">Organization</p><p className="text-ink-50">{payment.organization?.name || "—"}</p></div>
        <div className="card"><p className="label">Plan</p><p className="text-ink-50">{payment.plan?.name || "—"}</p></div>
        <div className="card"><p className="label">Billing Cycle</p><p className="text-ink-50">{payment.billing_cycle || "—"}</p></div>
        <div className="card"><p className="label">Method</p><p className="text-ink-50">{payment.payment_method}</p></div>
        <div className="card"><p className="label">UPI ID</p><p className="text-ink-50">{payment.upi_id || "—"}</p></div>
        <div className="card"><p className="label">UTR Reference</p><p className="text-ink-50">{payment.utr_reference || "—"}</p></div>
        <div className="card"><p className="label">Payment Date</p><p className="text-ink-50">{payment.payment_date || "—"}</p></div>
        <div className="card"><p className="label">Submitted</p><p className="text-ink-50">{formatDateTime(payment.created_at)}</p></div>
      </div>
      {payment.rejection_reason && (
        <div className="card border-red-500/30"><p className="label">Rejection Reason</p><p className="text-red-300">{payment.rejection_reason}</p></div>
      )}
      {screenshotUrl && (
        <div className="card">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-50">Payment Screenshot</h3>
          <img src={screenshotUrl} alt="Payment proof" className="max-h-96 rounded-xl border border-white/10" />
        </div>
      )}
      {payment.status !== "APPROVED" && payment.status !== "REJECTED" && (
        <div className="card flex flex-wrap gap-3">
          <button className="btn-primary" onClick={handleApprove} disabled={acting}>Approve & Activate</button>
          <button className="btn-secondary" onClick={markUnderReview} disabled={acting}>Mark Under Review</button>
          <button className="btn-danger" onClick={() => setShowReject(true)} disabled={acting}>Reject</button>
        </div>
      )}
      {showReject && (
        <div className="card space-y-3">
          <h3 className="font-display text-base font-semibold text-ink-50">Rejection Reason</h3>
          <textarea className="input" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this payment is rejected…" />
          <div className="flex gap-3">
            <button className="btn-danger" onClick={handleReject} disabled={acting}>{acting ? "Rejecting…" : "Confirm Reject"}</button>
            <button className="btn-secondary" onClick={() => { setShowReject(false); setRejectReason(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
