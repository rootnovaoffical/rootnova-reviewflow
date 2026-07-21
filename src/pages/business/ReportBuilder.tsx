import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  fetchReportTemplates,
  createReportTemplate,
  deleteReportTemplate,
  cloneReportTemplate,
  reportTypeMeta,
  generateReport,
} from "../../lib/reporting";
import { exportReport } from "../../lib/export-engine";
import { LoadingSpinner, EmptyState, PageHeader } from "../../components/ui";
import type { ReportType, ReportTemplate, ReportData, ExportFormat } from "../../lib/types";
void (null as unknown as ReportData);

const ALL_KPIS = [
  "total_reviews", "average_rating", "reviews_last_30_days", "ai_reviews_generated",
  "reviews_copied", "google_clicks", "sentiment_positive", "sentiment_neutral",
  "sentiment_negative", "conversion_rate", "reputation_score", "positive_percentage",
];

const ALL_CHARTS = [
  "rating_distribution", "sessions_over_time", "sentiment_split",
  "top_positive_categories", "top_negative_categories", "branch_performance",
];

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "month_to_date", label: "Month to Date" },
  { value: "quarter_to_date", label: "Quarter to Date" },
  { value: "year_to_date", label: "Year to Date" },
  { value: "all_time", label: "All Time" },
];

export default function ReportBuilder() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<ReportType>("custom");
  const [selectedKpis, setSelectedKpis] = useState<string[]>(["total_reviews", "average_rating"]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["rating_distribution", "sessions_over_time"]);
  const [datePreset, setDatePreset] = useState("last_30_days");

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (data?.business_id) setBusinessId(data.business_id);
        else setLoading(false);
      });
  }, [profile]);

  useEffect(() => {
    if (!businessId) return;
    fetchReportTemplates(businessId).then((t) => { setTemplates(t); setLoading(false); });
  }, [businessId]);

  const toggleKpi = (kpi: string) => {
    setSelectedKpis((prev) => prev.includes(kpi) ? prev.filter((k) => k !== kpi) : [...prev, kpi]);
  };

  const toggleChart = (chart: string) => {
    setSelectedCharts((prev) => prev.includes(chart) ? prev.filter((c) => c !== chart) : [...prev, chart]);
  };

  const handleSave = async () => {
    if (!businessId || !profile || !name.trim()) return;
    setSaving(true);
    await createReportTemplate({
      business_id: businessId,
      user_id: profile.id,
      name: name.trim(),
      description: description.trim() || null,
      report_type: reportType,
      selected_kpis: selectedKpis,
      selected_charts: selectedCharts,
      date_range_preset: datePreset,
      custom_date_start: null,
      custom_date_end: null,
      branch_ids: [],
      employee_ids: [],
      customer_segments: [],
      branding_config: {},
      layout_config: {},
      is_system_template: false,
      is_active: true,
      cloned_from: null,
    });
    setName("");
    setDescription("");
    const t = await fetchReportTemplates(businessId);
    setTemplates(t);
    setSaving(false);
  };

  const handlePreview = async () => {
    if (!businessId) return;
    setPreviewing(true);
    const report = await generateReport(businessId, reportType, datePreset);
    setPreviewData(report);
    setPreviewing(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!businessId || !confirm("Delete this template?")) return;
    await deleteReportTemplate(id, businessId);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClone = async (id: string) => {
    if (!businessId) return;
    const newName = prompt("Enter name for cloned template:");
    if (!newName?.trim()) return;
    await cloneReportTemplate(id, newName.trim());
    const t = await fetchReportTemplates(businessId);
    setTemplates(t);
  };

  if (loading) return <BusinessShell title="Report Builder"><div className="p-8"><LoadingSpinner /></div></BusinessShell>;

  return (
    <BusinessShell title="Report Builder">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        <PageHeader title="Custom Report Builder" subtitle="Create reusable report templates with custom KPIs, charts, and filters" />

        {/* Builder Form */}
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Template Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Custom Report" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="input-field w-full">
                {(Object.keys(reportTypeMeta) as ReportType[]).map((t) => (
                  <option key={t} value={t}>{reportTypeMeta[t].icon} {reportTypeMeta[t].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="input-field w-full" />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-2">Select KPIs</label>
            <div className="flex flex-wrap gap-2">
              {ALL_KPIS.map((kpi) => (
                <button
                  key={kpi}
                  onClick={() => toggleKpi(kpi)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedKpis.includes(kpi)
                      ? "bg-primary-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {kpi.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-2">Select Charts</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CHARTS.map((chart) => (
                <button
                  key={chart}
                  onClick={() => toggleChart(chart)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCharts.includes(chart)
                      ? "bg-primary-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {chart.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-1">Date Range Preset</label>
            <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="input-field w-full">
              {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <button onClick={handlePreview} disabled={previewing || !businessId} className="btn-secondary disabled:opacity-40">
              {previewing ? "Loading..." : "Preview Report"}
            </button>
            <button onClick={handleSave} disabled={saving || !name.trim() || !businessId} className="btn-primary disabled:opacity-40">
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        {/* Preview */}
        {previewData && (
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Report Preview</h3>
              <div className="flex gap-2">
                {(["pdf", "excel", "csv", "json"] as ExportFormat[]).map((fmt) => (
                  <button key={fmt} onClick={() => exportReport(previewData, fmt)} className="btn-secondary text-xs">
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(previewData.metrics).slice(0, 8).map(([key, val]) => (
                <div key={key} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-lg font-bold text-white">{typeof val === "number" ? (val % 1 !== 0 ? val.toFixed(2) : val) : String(val ?? "N/A")}</p>
                </div>
              ))}
            </div>
            {previewData.aiSummary && (
              <div className="mt-4 bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-slate-300">{previewData.aiSummary.summary}</p>
                <p className="text-xs text-slate-500 mt-2">Confidence: {previewData.aiSummary.confidence.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}

        {/* Saved Templates */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Saved Templates</h3>
          {templates.length === 0 ? (
            <EmptyState message="No templates saved yet. Create one above." />
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="flex items-center justify-between bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{reportTypeMeta[tmpl.report_type]?.icon ?? "📊"}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{tmpl.name}</p>
                      <p className="text-xs text-slate-500">
                        {tmpl.report_type.replace(/_/g, " ")} · {tmpl.selected_kpis.length} KPIs · {tmpl.selected_charts.length} charts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleClone(tmpl.id)} className="btn-secondary text-xs">Clone</button>
                    <button onClick={() => handleDeleteTemplate(tmpl.id)} className="text-red-400 hover:text-red-300 text-xs px-2">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
