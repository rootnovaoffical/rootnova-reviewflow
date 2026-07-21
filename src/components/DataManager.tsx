import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { Plus, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export type ColumnType = 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'date' | 'json' | 'array';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
  required?: boolean;
  editable?: boolean;
  showInTable?: boolean;
}

interface DataManagerProps {
  table: string;
  businessId?: string;
  organizationId?: string;
  columns: ColumnDef[];
  filter?: Record<string, unknown>;
  defaultValues?: Record<string, unknown>;
  pageSize?: number;
}

export default function DataManager({
  table, businessId, organizationId, columns, filter, defaultValues, pageSize = 25,
}: DataManagerProps) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const editableColumns = columns.filter((c) => c.editable !== false);
  const tableColumns = columns.filter((c) => c.showInTable !== false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(table).select('*');
      if (businessId) query = query.eq('business_id', businessId);
      if (organizationId) query = query.eq('organization_id', organizationId);
      if (filter) {
        for (const [k, v] of Object.entries(filter)) {
          query = query.eq(k, v as string);
        }
      }
      query = query.order('created_at', { ascending: false }).limit(200);
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      showToast('error', `Failed to load: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [table, businessId, organizationId, filter, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRows = rows.filter((row) => {
    if (!search) return true;
    return tableColumns.some((col) => {
      const val = row[col.key];
      return val != null && String(val).toLowerCase().includes(search.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pageRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  function openCreate() {
    setEditingRow(null);
    setFormData({ ...defaultValues, ...(businessId ? { business_id: businessId } : {}), ...(organizationId ? { organization_id: organizationId } : {}) });
    setShowForm(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditingRow(row);
    setFormData({ ...row });
    setShowForm(true);
  }

  async function save() {
    try {
      const payload: Record<string, unknown> = {};
      for (const col of editableColumns) {
        let val = formData[col.key];
        if (col.type === 'array' && typeof val === 'string') {
          val = (val as string).split('\n').map((s) => s.trim()).filter(Boolean);
        } else if (col.type === 'json' && typeof val === 'string') {
          try { val = JSON.parse(val); } catch { /* keep string */ }
        } else if (col.type === 'number' && val != null && val !== '') {
          val = Number(val);
        } else if (col.type === 'boolean') {
          val = Boolean(val);
        }
        if (col.required && (val == null || val === '')) {
          showToast('error', `${col.label} is required`);
          return;
        }
        payload[col.key] = val;
      }

      if (editingRow) {
        const { error } = await supabase.from(table).update(payload).eq('id', editingRow.id as string);
        if (error) throw error;
        showToast('success', 'Updated successfully');
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
        showToast('success', 'Created successfully');
      }
      setShowForm(false);
      loadData();
    } catch (e) {
      showToast('error', `Save failed: ${(e as Error).message}`);
    }
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this record?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Deleted');
      loadData();
    } catch (e) {
      showToast('error', `Delete failed: ${(e as Error).message}`);
    }
  }

  function renderInput(col: ColumnDef) {
    const val = formData[col.key] ?? '';
    const baseClass = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50 transition-colors';

    switch (col.type) {
      case 'textarea':
        return <textarea value={val as string} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass} rows={3} placeholder={col.label} />;
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={Boolean(val)} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.checked })} className="w-5 h-5 rounded accent-blue-500" />
            <span className="text-sm text-zinc-300">{Boolean(val) ? 'Yes' : 'No'}</span>
          </label>
        );
      case 'select':
        return (
          <select value={val as string} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass}>
            <option value="">— Select —</option>
            {(col.options || []).map((o) => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
          </select>
        );
      case 'number':
        return <input type="number" value={val as number | string} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass} placeholder={col.label} />;
      case 'date':
        return <input type="date" value={(val as string) ?? ''} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass} />;
      case 'json':
        return <textarea value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass} rows={4} placeholder='{}' />;
      case 'array':
        return <textarea value={Array.isArray(val) ? val.join('\n') : (val as string ?? '')} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass} rows={3} placeholder="One item per line" />;
      default:
        return <input type="text" value={val as string} onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })} className={baseClass} placeholder={col.label} />;
    }
  }

  function renderCell(row: Record<string, unknown>, col: ColumnDef) {
    const val = row[col.key];
    if (val == null) return <span className="text-zinc-600">—</span>;
    if (col.type === 'boolean') return val ? <span className="text-emerald-400">Yes</span> : <span className="text-zinc-500">No</span>;
    if (col.type === 'array' && Array.isArray(val)) return <span className="text-xs">{val.length} items</span>;
    if (col.type === 'json' && typeof val === 'object') return <span className="text-xs text-zinc-400">JSON</span>;
    if (col.type === 'date' || col.key === 'created_at' || col.key === 'updated_at') {
      return <span className="text-xs text-zinc-400">{new Date(val as string).toLocaleDateString()}</span>;
    }
    const str = String(val);
    return <span className="text-sm text-zinc-300">{str.length > 60 ? str.slice(0, 60) + '…' : str}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-400/50" />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading…</div>
      ) : pageRows.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No records found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  {tableColumns.map((col) => (
                    <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">{col.label}</th>
                  ))}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={(row.id as string) ?? i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    {tableColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3">{renderCell(row, col)}</td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-blue-400 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteRow(row.id as string)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900/95 border border-white/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editingRow ? 'Edit Record' : 'New Record'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {editableColumns.map((col) => (
                <div key={col.key}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">{col.label}{col.required && <span className="text-red-400"> *</span>}</label>
                  {renderInput(col)}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
