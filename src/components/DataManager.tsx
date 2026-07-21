import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit3, X, Save, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "select" | "textarea" | "date" | "json" | "array";
  options?: string[];
  editable?: boolean;
  required?: boolean;
  hideInTable?: boolean;
  defaultValue?: unknown;
}

export interface DataManagerProps {
  table: string;
  businessId?: string;
  organizationId?: string;
  columns: ColumnDef[];
  title: string;
  subtitle?: string;
  filter?: Record<string, unknown>;
  defaultValues?: Record<string, unknown>;
  searchable?: boolean;
  pageSize?: number;
}

export default function DataManager({ table, businessId, organizationId, columns, title, subtitle, filter, defaultValues, searchable = true, pageSize = 25 }: DataManagerProps) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from(table).select("*");
      const conditions: Record<string, unknown> = { ...filter };
      if (businessId) conditions.business_id = businessId;
      if (organizationId) conditions.organization_id = organizationId;
      for (const [k, v] of Object.entries(conditions)) q = q.eq(k, v);
      q = q.order("created_at", { ascending: false }).limit(200);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as Record<string, unknown>[]);
    } catch (err) {
      showToast(`Failed to load: ${(err as Error).message}`, "error");
      setRows([]);
    }
    setLoading(false);
  }, [table, businessId, organizationId, filter, showToast]);

  useEffect(() => { load(); }, [load]);

  const editableCols = columns.filter(c => c.editable !== false);
  const tableCols = columns.filter(c => !c.hideInTable);

  let filtered = rows;
  if (search && searchable) {
    const s = search.toLowerCase();
    filtered = rows.filter(r => tableCols.some(c => String(r[c.key] || "").toLowerCase().includes(s)));
  }
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const startCreate = () => {
    const f: Record<string, unknown> = {};
    editableCols.forEach(c => { f[c.key] = c.defaultValue ?? (c.type === "boolean" ? false : c.type === "number" ? 0 : c.type === "array" ? [] : c.type === "json" ? {} : ""); });
    if (defaultValues) Object.assign(f, defaultValues);
    if (businessId) f.business_id = businessId;
    if (organizationId) f.organization_id = organizationId;
    setForm(f); setEditing(null); setShowForm(true);
  };

  const startEdit = (row: Record<string, unknown>) => {
    const f: Record<string, unknown> = {};
    editableCols.forEach(c => { f[c.key] = row[c.key] ?? c.defaultValue ?? ""; });
    setForm(f); setEditing(row); setShowForm(true);
  };

  const handleSave = async () => {
    for (const c of editableCols) {
      if (c.required && !form[c.key]) { showToast(`${c.label} is required`, "error"); return; }
    }
    try {
      const payload: Record<string, unknown> = { ...form };
      for (const c of editableCols) {
        if (c.type === "array" && typeof payload[c.key] === "string") payload[c.key] = (payload[c.key] as string).split("\n").map((s: string) => s.trim()).filter(Boolean);
        if (c.type === "json" && typeof payload[c.key] === "string") { try { payload[c.key] = JSON.parse(payload[c.key] as string); } catch { payload[c.key] = {}; } }
        if (c.type === "number") payload[c.key] = Number(payload[c.key]) || 0;
      }
      if (editing) {
        const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
        if (error) throw error;
        showToast("Updated successfully!", "success");
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
        showToast("Created successfully!", "success");
      }
      setShowForm(false); setEditing(null); load();
    } catch (err) { showToast(`Save failed: ${(err as Error).message}`, "error"); }
  };

  const handleDelete = async (id: string) => {
    try { await supabase.from(table).delete().eq("id", id); showToast("Deleted", "success"); load(); }
    catch (err) { showToast(`Delete failed: ${(err as Error).message}`, "error"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 screen-enter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-white">{title}</h1>{subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}</div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Plus className="w-4 h-4" /> Add New</button>
      </div>

      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 rounded-xl glass border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" />
        </div>
      )}

      {showForm && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">{editing ? "Edit" : "Create New"}</h3><button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editableCols.map(c => (
              <div key={c.key} className={c.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-slate-400 mb-1">{c.label}{c.required && <span className="text-error-400"> *</span>}</label>
                {c.type === "select" ? (
                  <select value={String(form[c.key] || "")} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500">
                    <option value="">Select...</option>
                    {c.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : c.type === "textarea" ? (
                  <textarea value={String(form[c.key] || "")} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 resize-none" />
                ) : c.type === "boolean" ? (
                  <label className="flex items-center gap-2 mt-1"><input type="checkbox" checked={!!form[c.key]} onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })} className="w-4 h-4 rounded accent-primary-500" /><span className="text-sm text-slate-300">Enabled</span></label>
                ) : c.type === "array" ? (
                  <textarea value={Array.isArray(form[c.key]) ? (form[c.key] as string[]).join("\n") : String(form[c.key] || "")} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} rows={3} placeholder="One per line" className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 resize-none" />
                ) : c.type === "json" ? (
                  <textarea value={typeof form[c.key] === "object" ? JSON.stringify(form[c.key], null, 2) : String(form[c.key] || "{}")} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 resize-none font-mono" />
                ) : (
                  <input type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"} value={String(form[c.key] || "")} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" />
                )}
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Save className="w-4 h-4" /> Save</button>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {tableCols.map(c => <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{c.label}</th>)}
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={tableCols.length + 1} className="text-center py-12 text-slate-500 text-sm">No records found.</td></tr>
              ) : paged.map((row, i) => (
                <tr key={String(row.id || i)} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  {tableCols.map(c => (
                    <td key={c.key} className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate">
                      {c.type === "boolean" ? <span className={`px-2 py-0.5 rounded-full text-xs ${row[c.key] ? "bg-success-500/15 text-success-400" : "bg-slate-700 text-slate-400"}`}>{row[c.key] ? "Yes" : "No"}</span>
                      : c.type === "date" || c.key === "created_at" || c.key === "updated_at" ? <span className="text-xs text-slate-500">{row[c.key] ? new Date(String(row[c.key])).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}</span>
                      : c.type === "array" ? <span className="text-xs">{Array.isArray(row[c.key]) ? `${(row[c.key] as unknown[]).length} items` : "-"}</span>
                      : c.type === "json" ? <span className="text-xs text-slate-500">{typeof row[c.key] === "object" && row[c.key] ? "JSON" : "-"}</span>
                      : String(row[c.key] ?? "-")}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg glass text-slate-300 hover:text-white hover:bg-white/10 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(String(row.id))} className="p-1.5 rounded-lg glass text-error-400 hover:bg-error-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-slate-500">{filtered.length} records</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded-lg glass text-sm text-slate-300 disabled:opacity-30">Prev</button>
              <span className="px-3 py-1 text-sm text-slate-400">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded-lg glass text-sm text-slate-300 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
