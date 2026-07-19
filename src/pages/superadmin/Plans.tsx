import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { logAudit } from "../../lib/audit";
import { formatCurrency } from "../../lib/utils";
import type { Plan } from "../../lib/types";

export default function SuperAdminPlans() {
  const { show } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [edit, setEdit] = useState<Plan | null>(null);
  const [name, setName] = useState("");
  const [monthly, setMonthly] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data as Plan[]) || []);
  };
  useEffect(() => { load(); }, []);
  const openEdit = (p: Plan | null) => { setEdit(p); setName(p?.name ?? ""); setMonthly(p ? String(p.monthly_price) : ""); setActive(p?.is_active ?? true); setOpen(true); };
  const save = async () => {
    setBusy(true);
    if (edit) {
      const { error } = await supabase.from("plans").update({ name, monthly_price: Number(monthly), is_active: active, updated_at: new Date().toISOString() }).eq("id", edit.id);
      if (error) { show("Failed", "error"); setBusy(false); return; }
      await logAudit("plan.update", "plan", edit.id);
    } else {
      const { data, error } = await supabase.from("plans").insert({ name, slug: name.toLowerCase().replace(/\s+/g, "-"), monthly_price: Number(monthly), is_active: active, sort_order: plans.length + 1 }).select().single();
      if (error) { show("Failed", "error"); setBusy(false); return; }
      await logAudit("plan.create", "plan", (data as Plan).id);
    }
    setBusy(false); setOpen(false); show("Plan saved", "success"); load();
  };
  return (
    <div>
      <PageHeader title="Plans" subtitle="Manage subscription plans" actions={<button onClick={() => openEdit(null)} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm">New plan</button>} />
      <div className="p-8 grid gap-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div><p className="text-white font-medium">{p.name}</p><p className="text-slate-400 text-xs">{formatCurrency(p.monthly_price)}/month</p></div>
              <div className="flex items-center gap-3"><Badge color={p.is_active ? "green" : "slate"}>{p.is_active ? "active" : "inactive"}</Badge><button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs">Edit</button></div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Edit plan" : "New plan"}>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="Monthly price" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button><button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">{busy ? "Saving…" : "Save"}</button></div>
        </div>
      </Modal>
    </div>
  );
}
