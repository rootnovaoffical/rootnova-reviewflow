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
  const [payment, setPayment] = useState<(Payment & { organization: any }) | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!paymentId) return;
    const { data, error } = await supabase.from("payments").select("*, organization:organizations!payments_organization_id_fkey(name)").eq("id", paymentId).maybeSingle();
    if (error || !data) { setError("Payment not found"); setLoading(false); return; }
    setPayment(data as any);
    if ((data as any).screenshot_path) {
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl((data as any).screenshot_path, 3600);
      if (signed) setScreenshotUrl(signed.signedUrl);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [paymentId]);

  const updateStatus = async (status: "APPROVED" | "REJECTED" | "UNDER_REVIEW") => {
    setActing(true);
    const { error } = await supabase.from("payments").update({ status, reviewed_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) toast(error.message, "error"); else { toast(`Payment ${status.toLowerCase()}`, "success"); load(); }
    setActing(false);
  };

  if (loading) return <Loading message="Loading payment…" />;
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
        <div className="card"><p className="label">Method</p><p className="text-ink-50">{payment.payment_method}</p></div>
        <div className="card"><p className="label">UPI ID</p><p className="text-ink-50">{payment.upi_id || "—"}</p></div>
        <div className="card"><p className="label">UTR Reference</p><p className="text-ink-50">{payment.utr_reference || "—"}</p></div>
        <div className="card"><p className="label">Payment Date</p><p className="text-ink-50">{payment.payment_date || "—"}</p></div>
        <div className="card"><p className="label">Submitted</p><p className="text-ink-50">{formatDateTime(payment.created_at)}</p></div>
      </div>
      {screenshotUrl && (
        <div className="card">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-50">Payment Screenshot</h3>
          <img src={screenshotUrl} alt="Payment proof" className="max-h-96 rounded-xl border border-white/10" />
        </div>
      )}
      <div className="card flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => updateStatus("APPROVED")} disabled={acting}>Approve</button>
        <button className="btn-secondary" onClick={() => updateStatus("UNDER_REVIEW")} disabled={acting}>Mark Under Review</button>
        <button className="btn-danger" onClick={() => updateStatus("REJECTED")} disabled={acting}>Reject</button>
      </div>
    </div>
  );
}
