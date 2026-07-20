import { useEffect, useState, useRef } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import type { Payment } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { insertAuditLog } from "../../lib/auth";
import { uploadPaymentProof } from "../../lib/storage";
import { formatCurrency, formatDate } from "../../lib/utils";

export default function PartnerPayments() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { upiId, upiQrUrl } = useBranding();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!profile) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single()
      .then(({ data: mem }) => {
        if (mem?.organization_id) {
          setOrgId(mem.organization_id);
          supabase.from("payments").select("*").eq("organization_id", mem.organization_id).order("created_at", { ascending: false }).then(({ data }) => setPayments(data as Payment[] || []));
        } else { setPayments([]); }
      });
  };
  useEffect(() => { load(); }, [profile]);

  const submitPayment = async () => {
    if (!profile || !orgId || !utr || !amount) return;
    const file = fileRef.current?.files?.[0];
    const { data: payData } = await supabase.from("payments").insert({
      organization_id: orgId, amount: Number(amount), payment_purpose: "SUBSCRIPTION", payment_method: "UPI", upi_id: upiId, utr_reference: utr, status: "PENDING", submitted_by: profile.id, payment_date: new Date().toISOString().slice(0, 10),
    }).select().single();
    if (!payData) { showToast("Failed to submit payment", "error"); return; }
    if (file) {
      const { path } = await uploadPaymentProof(orgId, payData.id, file);
      if (path) await supabase.from("payments").update({ screenshot_path: path }).eq("id", payData.id);
    }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "payment_submitted", target_type: "payment", target_id: payData.id, organization_id: orgId, metadata: { amount: Number(amount), utr } });
    showToast("Payment submitted", "success");
    setShowSubmit(false); setUtr(""); setAmount(""); load();
  };

  if (!payments) return <Layout title="Payments"><Loading /></Layout>;

  return (
    <Layout title="Payments">
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">UPI Payment Details</h3>
        {upiId && <p className="text-white mb-2">UPI ID: <span className="font-mono text-primary-300">{upiId}</span></p>}
        {upiQrUrl && <img src={upiQrUrl} alt="UPI QR" className="w-40 h-40 rounded-xl" />}
        {!upiId && !upiQrUrl && <p className="text-slate-500 text-sm">UPI not configured. Contact support.</p>}
        <button onClick={() => setShowSubmit(true)} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Submit Payment Proof</button>
      </div>
      {payments.length === 0 ? <EmptyState title="No payments yet" /> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">UTR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4 text-slate-400">{p.utr_reference || "—"}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${p.status === "APPROVED" ? "bg-success-500/20 text-success-400" : p.status === "REJECTED" ? "bg-error-500/20 text-error-400" : p.status === "UNDER_REVIEW" ? "bg-warning-500/20 text-warning-400" : "bg-slate-500/20 text-slate-400"}`}>{p.status}</span></td>
                  <td className="px-6 py-4 text-slate-400">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSubmit(false)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Submit Payment Proof</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-slate-400 mb-1">Amount (INR)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">UTR Reference</label><input value={utr} onChange={(e) => setUtr(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Screenshot</label><input ref={fileRef} type="file" accept="image/*" className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" /></div>
            </div>
            <div className="flex gap-3 mt-4"><button onClick={submitPayment} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg">Submit</button><button onClick={() => setShowSubmit(false)} className="flex-1 py-2 glass text-white text-sm font-medium rounded-lg">Cancel</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
