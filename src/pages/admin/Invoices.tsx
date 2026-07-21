import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Loading, EmptyState } from "../../components/States";
import { listAllInvoices } from "../../lib/billing";
import type { Invoice } from "../../lib/types";

type InvoiceWithOrg = Invoice & { organization: { name: string } | null };

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  sent: "bg-primary-500/20 text-primary-400",
  paid: "bg-success-500/20 text-success-400",
  void: "bg-error-500/20 text-error-400",
  overdue: "bg-warning-500/20 text-warning-400",
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<InvoiceWithOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllInvoices()
      .then(setInvoices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Invoices">
      {loading ? (
        <Loading />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices" message="Invoices will appear here once generated." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-slate-300">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-300">{inv.organization?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.billing_cycle}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(inv.period_start).toLocaleDateString()} — {new Date(inv.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">₹{inv.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[inv.status] ?? "bg-slate-500/20 text-slate-400"}`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
