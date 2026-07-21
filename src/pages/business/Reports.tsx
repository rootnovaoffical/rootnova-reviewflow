import { useEffect, useState, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  fetchReportSnapshots,
  deleteReportSnapshot,
  generateReport,
  saveReportSnapshot,
  reportTypeMeta,
  trackReportDownload,
} from "../../lib/reporting";
import { exportReport } from "../../lib/export-engine";
import { LoadingSpinner, EmptyState, PageHeader } from "../../components/ui";
import type { ReportSnapshot, ReportType, ReportData, ExportFormat } from "../../lib/types";

const REPORT_TYPES = Object.keys(reportTypeMeta) as ReportType[];

export default function Reports() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>("executive");
  const [datePreset, setDatePreset] = useState("last_30_days");
  const [viewing, setViewing] = useState<ReportData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (data?.business_id) setBusinessId(data.business_id);
        else setLoading(false);
      });
  }, [profile]);

  const loadSnapshots = useCallback(async () => {
    if (!businessId) return;
    const data = await fetchReportSnapshots(businessId);
    setSnapshots(data);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  const handleGenerate = async () => {
    if (!businessId) return;
    setGenerating(true);
    try {
      const report = await generateReport(businessId, selectedType, datePreset);
      await saveReportSnapshot({
        business_id: businessId,
        user_id: profile!.id,
        template_id: null,
        scheduled_report_id: null,
        report_type: report.reportType,
        title: report.title,
        date_range_start: report.dateRange.start,
        date_range_end: report.dateRange.end,
        metrics: report.metrics,
        chart_data: report.charts,
        ai_summary: report.aiSummary as Record<string, unknown> | null,
        ai_recommendations: null,
        ai_confidence: report.aiSummary?.confidence ?? null,
        export_formats: ["pdf", "excel", "csv", "json"],
        file_urls: null,
        status: "generated",
        generated_at: new Date().toISOString(),
      });
      await loadSnapshots();
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const handleView = async (snap: ReportSnapshot) => {
    setViewLoading(true);
    const report: ReportData = {
      reportType: snap.report_type,
      title: snap.title,
      dateRange: { start: snap.date_range_start ?? "", end: snap.date_range_end ?? "" },
      metrics: snap.metrics,
      charts: snap.chart_data,
      aiSummary: snap.ai_summary as ReportData["aiSummary"],
    };
    setViewing(report);
    setViewLoading(false);
  };

  const handleExport = async (snap: ReportSnapshot, format: ExportFormat) => {
    const report: ReportData = {
      reportType: snap.report_type,
      title: snap.title,
      dateRange: { start: snap.date_range_start ?? "", end: snap.date_range_end ?? "" },
      metrics: snap.metrics,
      charts: snap.chart_data,
      aiSummary: snap.ai_summary as ReportData["aiSummary"],
    };
    exportReport(report, format);
    await trackReportDownload(snap.business_id, snap.id, format);
  };

  const handleDelete = async (snap: ReportSnapshot) => {
    if (!confirm(`Delete "${snap.title}"?`)) return;
    await deleteReportSnapshot(snap.id, snap.business_id);
    await loadSnapshots();
  };

  if (loading) return <BusinessShell title="Reports"><div className="p-8"><LoadingSpinner /></div></BusinessShell>;

  return (
    <BusinessShell title="Reports">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        <PageHeader title="Enterprise Reports" subtitle="Generate, export, and manage business reports" />

        {/* Generate New Report */}
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Generate New Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Report Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ReportType)}
                className="input-field w-full"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{reportTypeMeta[t].icon} {reportTypeMeta[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date Range</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="input-field w-full"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="month_to_date">Month to Date</option>
                <option value="quarter_to_date">Quarter to Date</option>
                <option value="year_to_date">Year to Date</option>
                <option value="all_time">All Time</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={generating || !businessId}
                className="btn-primary w-full disabled:opacity-40"
              >
                {generating ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{reportTypeMeta[selectedType]?.description}</p>
        </div>

        {/* Report Viewer Modal */}
        {viewing && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
            <div className="glass rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{viewing.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(viewing.dateRange.start).toLocaleDateString()} — {new Date(viewing.dateRange.end).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {Object.entries(viewing.metrics).slice(0, 8).map(([key, val]) => (
                  <div key={key} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                    <p className="text-lg font-bold text-white">
                      {typeof val === "number" ? (val % 1 !== 0 ? val.toFixed(2) : val) : String(val ?? "N/A")}
                    </p>
                  </div>
                ))}
              </div>

              {/* AI Summary */}
              {viewing.aiSummary && (
                <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-blue-300 mb-2">AI Executive Summary</h3>
                  <p className="text-sm text-slate-300 mb-3">{viewing.aiSummary.summary}</p>
                  {viewing.aiSummary.insights.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-500 mb-1">Key Insights:</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {viewing.aiSummary.insights.map((i, idx) => <li key={idx}>• {i}</li>)}
                      </ul>
                    </div>
                  )}
                  {viewing.aiSummary.recommendations.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-500 mb-1">Recommendations:</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {viewing.aiSummary.recommendations.map((r, idx) => <li key={idx}>• {r}</li>)}
                      </ul>
                    </div>
                  )}
                  {viewing.aiSummary.riskAlerts.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-red-400 mb-1">Risk Alerts:</p>
                      <ul className="text-sm text-red-300 space-y-1">
                        {viewing.aiSummary.riskAlerts.map((a, idx) => <li key={idx}>⚠ {a}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">Confidence: {viewing.aiSummary.confidence.toFixed(1)}%</p>
                </div>
              )}

              {/* Export buttons */}
              <div className="flex flex-wrap gap-2">
                {(["pdf", "excel", "csv", "json", "print"] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => exportReport(viewing, fmt)}
                    className="btn-secondary text-xs"
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Report History */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Generated Reports</h3>
          {snapshots.length === 0 ? (
            <EmptyState message="No reports generated yet. Use the form above to generate your first report." />
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{reportTypeMeta[snap.report_type]?.icon ?? "📊"}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{snap.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(snap.generated_at).toLocaleString()} · {snap.report_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleView(snap)} className="btn-secondary text-xs" disabled={viewLoading}>View</button>
                    <div className="relative group">
                      <button className="btn-secondary text-xs">Export ▾</button>
                      <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-slate-800 border border-white/10 rounded-lg shadow-xl z-10 min-w-[100px]">
                        {(["pdf", "excel", "csv", "json"] as ExportFormat[]).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => handleExport(snap, fmt)}
                            className="px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 text-left"
                          >
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(snap)} className="text-red-400 hover:text-red-300 text-xs px-2">Delete</button>
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
