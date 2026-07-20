import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { LoadingSpinner, ErrorState, Badge } from "../../components/ui";
import type { Payment, Organization } from "../../lib/types";

interface PaymentWithOrg extends Payment {
  organizations: Pick<Organization, "name"> | null;
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [payment, setPayment] = useState<PaymentWithOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("payments")
      .select("*, organizations(name)")
      .eq("id", id)
      .maybeSingle();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Payment not found");
      setLoading(false);
      return;
    }

    const p = data as PaymentWithOrg;
    setPayment(p);

    if (p.screenshot_path) {
      const { data: urlData } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(p.screenshot_path, 3600);
      setSignedUrl(urlData?.signedUrl ?? null);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove() {
    if (!id || !session?.user) return;
    setActionLoading(true);
    const { error: err } = await supabase
      .from("payments")
      .update({
        status: "APPROVED",
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    setActionLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/payments");
  }

  async function handleReject() {
    if (!id || !session?.user || !rejectionReason.trim()) return;
    setActionLoading(true);
    const { error: err } = await supabase
      .from("payments")
      .update({
        status: "REJECTED",
        rejection_reason: rejectionReason.trim(),
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    setActionLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/payments");
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!payment) return <ErrorState message="Payment not found" />;

  const canAct = payment.status === "PENDING";

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link to="/payments" className="text-sm text-primary-600 hover:underline">← Back to Payments</Link>
      </div>

      <div className="card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Payment Details</h1>
          <Badge status={payment.status} />
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Organization</dt>
            <dd className="font-medium text-slate-900">{payment.organizations?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-medium text-slate-900">₹{payment.amount.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Purpose</dt>
            <dd className="font-medium text-slate-900">{payment.payment_purpose}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Method</dt>
            <dd className="font-medium text-slate-900">{payment.payment_method}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">UPI ID</dt>
            <dd className="font-medium text-slate-900">{payment.upi_id ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">UTR Reference</dt>
            <dd className="font-medium text-slate-900">{payment.utr_reference ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Payment Date</dt>
            <dd className="font-medium text-slate-900">
              {payment.payment_date ? new Date(payment.payment_date).toLocaleString() : "—"}
            </dd>
          </div>
          {payment.rejection_reason && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Rejection Reason</dt>
              <dd className="font-medium text-red-600">{payment.rejection_reason}</dd>
            </div>
          )}
        </dl>

        {signedUrl && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-slate-700">Payment Screenshot</p>
            <img src={signedUrl} alt="Payment proof" className="max-w-full rounded-lg border border-slate-200" />
          </div>
        )}

        {canAct && (
          <div className="mt-6">
            {!showReject ? (
              <div className="flex gap-3">
                <button className="btn-primary" disabled={actionLoading} onClick={handleApprove}>
                  {actionLoading ? "Processing..." : "Approve"}
                </button>
                <button className="btn-danger" disabled={actionLoading} onClick={() => setShowReject(true)}>
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rejection Reason</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
                <div className="flex gap-3">
                  <button className="btn-danger" disabled={actionLoading || !rejectionReason.trim()} onClick={handleReject}>
                    {actionLoading ? "Processing..." : "Confirm Reject"}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
