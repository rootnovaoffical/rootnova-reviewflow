import { supabase } from './supabase';
import { trackEvent } from './analytics';
import {
  getDashboardMetrics,
  getSessionsOverTime,
  getSentimentSplit,
  getTopCategories,
  getEventCounts,
} from './analytics';
import { getEnterpriseDashboard, getComparisonData } from './enterprise';
import { computeAnalytics as computeCommAnalytics } from './communication';
import { computeWorkflowAnalytics } from './workflow';
import type { Workflow, WorkflowExecution } from './types';
import type {
  ReportType,
  ReportTemplate,
  ScheduledReport,
  ReportSnapshot,
  ReportDelivery,
  ReportAuditLog,
  ReportData,
  ExportFormat,
  ReportFrequency,
  DeliveryChannel,
} from './types';

// ---- Report Type Metadata ----
export const reportTypeMeta: Record<ReportType, { label: string; icon: string; description: string }> = {
  executive: { label: 'Executive Report', icon: '📊', description: 'AI-powered executive summary with KPIs, growth, and strategic recommendations' },
  business_health: { label: 'Business Health', icon: '❤️', description: 'Overall business health score, rating trends, and sentiment analysis' },
  ai_performance: { label: 'AI Performance', icon: '🤖', description: 'AI agent task completion, recommendations, and automation performance' },
  customer: { label: 'Customer Report', icon: '👥', description: 'Customer 360 insights, segmentation, growth, and engagement metrics' },
  review_performance: { label: 'Review Performance', icon: '⭐', description: 'Review volume, rating distribution, response rates, and trends' },
  reputation: { label: 'Reputation Report', icon: '🌟', description: 'Online reputation score, review sites, and competitive analysis' },
  staff_performance: { label: 'Staff Performance', icon: '👨‍💼', description: 'Employee performance, review attribution, and productivity metrics' },
  qr_analytics: { label: 'QR Analytics', icon: '📱', description: 'QR code scans, conversion rates, and placement performance' },
  campaign: { label: 'Campaign Report', icon: '📣', description: 'Campaign performance, ROI, engagement, and AI recommendations' },
  communication: { label: 'Communication Report', icon: '💬', description: 'Message delivery rates, channel performance, and engagement' },
  workflow: { label: 'Workflow Report', icon: '⚡', description: 'Workflow execution, automation rates, and process efficiency' },
  loyalty: { label: 'Loyalty Report', icon: '🎁', description: 'Loyalty program performance, reward redemptions, and customer retention' },
  enterprise_multi_location: { label: 'Enterprise Multi-Location', icon: '🏢', description: 'Cross-location comparison, branch performance, and regional analysis' },
  ai_executive_summary: { label: 'AI Executive Summary', icon: '🧠', description: 'AI-generated executive briefing with strategic insights and forecasts' },
  custom: { label: 'Custom Report', icon: '🔧', description: 'Custom report with user-selected KPIs, charts, and filters' },
};

export const frequencyMeta: Record<ReportFrequency, { label: string; description: string }> = {
  daily: { label: 'Daily', description: 'Every day' },
  weekly: { label: 'Weekly', description: 'Every week' },
  monthly: { label: 'Monthly', description: 'Every month' },
  quarterly: { label: 'Quarterly', description: 'Every quarter' },
  yearly: { label: 'Yearly', description: 'Every year' },
  custom: { label: 'Custom', description: 'Custom cron schedule' },
};

export const deliveryChannelMeta: Record<DeliveryChannel, { label: string; icon: string }> = {
  email: { label: 'Email', icon: '✉️' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  download: { label: 'Download Center', icon: '📥' },
};

export const exportFormatMeta: Record<ExportFormat, { label: string; icon: string; mimeType: string }> = {
  pdf: { label: 'PDF', icon: '📄', mimeType: 'application/pdf' },
  excel: { label: 'Excel', icon: '📊', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  csv: { label: 'CSV', icon: '📃', mimeType: 'text/csv' },
  json: { label: 'JSON', icon: '🔧', mimeType: 'application/json' },
  print: { label: 'Print', icon: '🖨️', mimeType: 'text/html' },
};

// ---- Date Range Helpers ----
export function getDateRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start = new Date();
  switch (preset) {
    case 'today': start.setHours(0, 0, 0, 0); break;
    case 'yesterday': start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); break;
    case 'last_7_days': start.setDate(start.getDate() - 7); break;
    case 'last_30_days': start.setDate(start.getDate() - 30); break;
    case 'last_90_days': start.setDate(start.getDate() - 90); break;
    case 'last_12_months': start.setFullYear(start.getFullYear() - 1); break;
    case 'month_to_date': start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case 'quarter_to_date': start.setMonth(Math.floor(start.getMonth() / 3) * 3); start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case 'year_to_date': start.setMonth(0); start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case 'all_time': start = new Date(2020, 0, 1); break;
    default: start.setDate(start.getDate() - 30);
  }
  return { start: start.toISOString(), end };
}

// ---- Report Generation ----
export async function generateReport(
  businessId: string,
  reportType: ReportType,
  dateRangePreset: string = 'last_30_days',
): Promise<ReportData> {
  const range = getDateRange(dateRangePreset);
  const filters = { businessId };

  switch (reportType) {
    case 'executive':
    case 'business_health':
    case 'ai_executive_summary': {
      const [metrics, sessionsOverTime, sentiment, topPos, topNeg, eventCounts] = await Promise.all([
        getDashboardMetrics(filters),
        getSessionsOverTime(filters, 30),
        getSentimentSplit(filters),
        getTopCategories(filters, 'POSITIVE'),
        getTopCategories(filters, 'NEGATIVE'),
        getEventCounts(filters),
      ]);
      return {
        reportType,
        title: reportTypeMeta[reportType].label,
        dateRange: range,
        metrics: {
          totalReviews: metrics.totalSessions,
          averageRating: metrics.averageRating,
          reviewsLast30Days: metrics.sessionsLast30Days,
          aiReviewsGenerated: metrics.aiReviewsGenerated,
          reviewsCopied: eventCounts.copied,
          googleClicks: eventCounts.googleClicked,
          sentimentPositive: sentiment.positive,
          sentimentNeutral: sentiment.neutral,
          sentimentNegative: sentiment.negative,
        },
        charts: {
          sessionsOverTime,
          topPositiveCategories: topPos,
          topNegativeCategories: topNeg,
          sentimentSplit: sentiment,
        },
        aiSummary: await generateAISummary(metrics, sentiment, topPos, topNeg),
      };
    }

    case 'review_performance': {
      const [metrics, sessionsOverTime, sentiment, eventCounts] = await Promise.all([
        getDashboardMetrics(filters),
        getSessionsOverTime(filters, 30),
        getSentimentSplit(filters),
        getEventCounts(filters),
      ]);
      return {
        reportType,
        title: 'Review Performance Report',
        dateRange: range,
        metrics: {
          totalReviews: metrics.totalSessions,
          averageRating: metrics.averageRating,
          reviewsLast30Days: metrics.sessionsLast30Days,
          aiReviewsGenerated: metrics.aiReviewsGenerated,
          reviewsCopied: eventCounts.copied,
          googleClicks: eventCounts.googleClicked,
          conversionRate: metrics.totalSessions > 0 ? (eventCounts.googleClicked / metrics.totalSessions) * 100 : 0,
        },
        charts: { sessionsOverTime, sentimentSplit: sentiment },
        aiSummary: null,
      };
    }

    case 'reputation': {
      const [metrics, sentiment, eventCounts] = await Promise.all([
        getDashboardMetrics(filters),
        getSentimentSplit(filters),
        getEventCounts(filters),
      ]);
      const reputationScore = metrics.averageRating * 20;
      return {
        reportType,
        title: 'Reputation Report',
        dateRange: range,
        metrics: {
          reputationScore,
          averageRating: metrics.averageRating,
          totalReviews: metrics.totalSessions,
          positivePercentage: metrics.totalSessions > 0 ? (sentiment.positive / metrics.totalSessions) * 100 : 0,
          negativePercentage: metrics.totalSessions > 0 ? (sentiment.negative / metrics.totalSessions) * 100 : 0,
          googleClicks: eventCounts.googleClicked,
        },
        charts: { sentimentSplit: sentiment },
        aiSummary: null,
      };
    }

    case 'enterprise_multi_location': {
      let enterpriseDash = null;
      let branches: unknown = null;
      let comparison: unknown = null;
      try {
        const { getUserOrgId } = await import('./enterprise');
        const orgId = await getUserOrgId();
        if (orgId) {
          enterpriseDash = await getEnterpriseDashboard(orgId);
          comparison = await getComparisonData(orgId);
        }
      } catch { /* enterprise may not be set up */ }
      return {
        reportType,
        title: 'Enterprise Multi-Location Report',
        dateRange: range,
        metrics: {
          enterpriseDashboard: enterpriseDash,
          comparison,
        },
        charts: { branchPerformance: branches },
        aiSummary: null,
      };
    }

    case 'communication': {
      let commMetrics: Record<string, unknown> = {};
      try {
        const { data: msgs } = await supabase.from('messages').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(500);
        if (msgs) commMetrics = computeCommAnalytics(msgs as unknown as Parameters<typeof computeCommAnalytics>[0]) as unknown as Record<string, unknown>;
      } catch { /* no comm data */ }
      return {
        reportType,
        title: 'Communication Report',
        dateRange: range,
        metrics: commMetrics,
        charts: {},
        aiSummary: null,
      };
    }

    case 'workflow': {
      let wfMetrics: Record<string, unknown> = {};
      try {
        const [wfs, execs] = await Promise.all([
          supabase.from('workflows').select('*').eq('business_id', businessId),
          supabase.from('workflow_executions').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(500),
        ]);
        if (wfs.data && execs.data) {
          wfMetrics = computeWorkflowAnalytics(wfs.data as unknown as Workflow[], execs.data as unknown as WorkflowExecution[]) as unknown as Record<string, unknown>;
        }
      } catch { /* no workflow data */ }
      return {
        reportType,
        title: 'Workflow Report',
        dateRange: range,
        metrics: wfMetrics,
        charts: {},
        aiSummary: null,
      };
    }

    case 'campaign':
    case 'customer':
    case 'staff_performance':
    case 'qr_analytics':
    case 'loyalty':
    case 'ai_performance':
    default: {
      const [metrics, sessionsOverTime, sentiment] = await Promise.all([
        getDashboardMetrics(filters),
        getSessionsOverTime(filters, 30),
        getSentimentSplit(filters),
      ]);
      return {
        reportType,
        title: reportTypeMeta[reportType]?.label ?? 'Custom Report',
        dateRange: range,
        metrics: {
          totalReviews: metrics.totalSessions,
          averageRating: metrics.averageRating,
          reviewsLast30Days: metrics.sessionsLast30Days,
          sentiment,
        },
        charts: { sessionsOverTime, sentimentSplit: sentiment },
        aiSummary: null,
      };
    }
  }
}

async function generateAISummary(
  metrics: { totalSessions: number; averageRating: number; sessionsLast30Days: number; aiReviewsGenerated: number },
  sentiment: { positive: number; neutral: number; negative: number },
  topPos: { category: string; count: number }[],
  topNeg: { category: string; count: number }[],
): Promise<ReportData['aiSummary']> {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative || 1;
  const positivePct = Math.round((sentiment.positive / total) * 100);
  const negativePct = Math.round((sentiment.negative / total) * 100);
  const insights: string[] = [];
  const recommendations: string[] = [];
  const riskAlerts: string[] = [];

  if (metrics.averageRating >= 4.5) insights.push(`Excellent rating of ${metrics.averageRating.toFixed(1)} stars — top-tier reputation.`);
  else if (metrics.averageRating >= 4.0) insights.push(`Strong rating of ${metrics.averageRating.toFixed(1)} stars with room for improvement.`);
  else if (metrics.averageRating < 3.5) { insights.push(`Below-average rating of ${metrics.averageRating.toFixed(1)} stars needs attention.`); riskAlerts.push('Rating below 3.5 — immediate action recommended.'); }

  if (positivePct >= 80) insights.push(`${positivePct}% positive sentiment — customers are highly satisfied.`);
  if (negativePct > 20) { insights.push(`${negativePct}% negative sentiment detected.`); riskAlerts.push('Negative sentiment above 20% — review feedback patterns.'); }

  if (topPos.length > 0) insights.push(`Top positive category: ${topPos[0].category} (${topPos[0].count} mentions).`);
  if (topNeg.length > 0) recommendations.push(`Address negative feedback in: ${topNeg[0].category}.`);
  if (metrics.aiReviewsGenerated > 0) insights.push(`${metrics.aiReviewsGenerated} AI-assisted reviews generated.`);
  recommendations.push('Continue collecting reviews through QR placement optimization.');
  if (negativePct > 15) recommendations.push('Implement automated response workflow for negative reviews.');

  return {
    summary: `Business has ${metrics.totalSessions} total reviews with an average rating of ${metrics.averageRating.toFixed(1)} stars. ${positivePct}% positive sentiment, ${negativePct}% negative.`,
    insights,
    recommendations,
    riskAlerts,
    forecast: metrics.sessionsLast30Days > 0 ? `Projected ${Math.round(metrics.sessionsLast30Days * 1.1)} reviews in the next 30 days based on current trend.` : 'Insufficient data for forecast.',
    confidence: Math.min(95, 60 + Math.min(35, metrics.totalSessions / 10)),
  };
}

// ---- Report Template CRUD ----
export async function fetchReportTemplates(businessId: string): Promise<ReportTemplate[]> {
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as ReportTemplate[];
}

export async function createReportTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ReportTemplate | null> {
  const { data, error } = await supabase.from('report_templates').insert(template).select().maybeSingle();
  if (error || !data) return null;
  await logReportAction(template.business_id, 'template_created', 'report_template', data.id, { name: template.name });
  return data as ReportTemplate;
}

export async function updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate | null> {
  const { data, error } = await supabase.from('report_templates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
  if (error || !data) return null;
  await logReportAction(data.business_id, 'template_modified', 'report_template', id, { updates });
  return data as ReportTemplate;
}

export async function deleteReportTemplate(id: string, businessId: string): Promise<boolean> {
  const { error } = await supabase.from('report_templates').delete().eq('id', id);
  if (error) return false;
  await logReportAction(businessId, 'template_deleted', 'report_template', id, {});
  return true;
}

export async function cloneReportTemplate(id: string, newName: string): Promise<ReportTemplate | null> {
  const { data, error } = await supabase.from('report_templates').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const source = data as ReportTemplate;
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = source;
  const clone = { ...rest, name: newName, cloned_from: id };
  return createReportTemplate(clone);
}

// ---- Report Snapshot CRUD ----
export async function fetchReportSnapshots(businessId: string, limit = 20): Promise<ReportSnapshot[]> {
  const { data, error } = await supabase
    .from('report_snapshots')
    .select('*')
    .eq('business_id', businessId)
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ReportSnapshot[];
}

export async function saveReportSnapshot(snapshot: Omit<ReportSnapshot, 'id' | 'created_at'>): Promise<ReportSnapshot | null> {
  const { data, error } = await supabase.from('report_snapshots').insert(snapshot).select().maybeSingle();
  if (error || !data) return null;
  await logReportAction(snapshot.business_id, 'report_generated', 'report_snapshot', data.id, { report_type: snapshot.report_type, title: snapshot.title });
  return data as ReportSnapshot;
}

export async function deleteReportSnapshot(id: string, businessId: string): Promise<boolean> {
  const { error } = await supabase.from('report_snapshots').delete().eq('id', id);
  if (error) return false;
  await logReportAction(businessId, 'report_deleted', 'report_snapshot', id, {});
  return true;
}

export async function getReportSnapshot(id: string): Promise<ReportSnapshot | null> {
  const { data, error } = await supabase.from('report_snapshots').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as ReportSnapshot;
}

// ---- Scheduled Report CRUD ----
export async function fetchScheduledReports(businessId: string): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as ScheduledReport[];
}

export async function createScheduledReport(sched: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledReport | null> {
  const nextRun = calculateNextRun(sched.frequency, sched.custom_cron);
  const { data, error } = await supabase.from('scheduled_reports').insert({ ...sched, next_run_at: nextRun }).select().maybeSingle();
  if (error || !data) return null;
  await logReportAction(sched.business_id, 'report_scheduled', 'scheduled_report', data.id, { name: sched.name, frequency: sched.frequency });
  return data as ScheduledReport;
}

export async function updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
  const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
  if (updates.frequency) updateData.next_run_at = calculateNextRun(updates.frequency, updates.custom_cron ?? null);
  const { data, error } = await supabase.from('scheduled_reports').update(updateData).eq('id', id).select().maybeSingle();
  if (error || !data) return null;
  return data as ScheduledReport;
}

export async function deleteScheduledReport(id: string, businessId: string): Promise<boolean> {
  const { error } = await supabase.from('scheduled_reports').delete().eq('id', id);
  if (error) return false;
  await logReportAction(businessId, 'schedule_deleted', 'scheduled_report', id, {});
  return true;
}

// ---- Delivery Logs ----
export async function fetchReportDeliveries(businessId: string, scheduledReportId?: string): Promise<ReportDelivery[]> {
  let q = supabase.from('report_deliveries').select('*').eq('business_id', businessId);
  if (scheduledReportId) q = q.eq('scheduled_report_id', scheduledReportId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
  if (error || !data) return [];
  return data as ReportDelivery[];
}

// ---- Audit Logs ----
export async function fetchReportAuditLogs(businessId: string, limit = 50): Promise<ReportAuditLog[]> {
  const { data, error } = await supabase
    .from('report_audit_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ReportAuditLog[];
}

async function logReportAction(businessId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>): Promise<void> {
  try {
    await supabase.from('report_audit_logs').insert({ business_id: businessId, action, entity_type: entityType, entity_id: entityId, details });
  } catch { /* never break flow */ }
}

// ---- Scheduler Helpers ----
export function calculateNextRun(frequency: ReportFrequency, _customCron: string | null = null): string | null {
  const now = new Date();
  switch (frequency) {
    case 'daily': now.setDate(now.getDate() + 1); now.setHours(9, 0, 0, 0); break;
    case 'weekly': now.setDate(now.getDate() + (7 - now.getDay())); now.setHours(9, 0, 0, 0); break;
    case 'monthly': now.setMonth(now.getMonth() + 1); now.setDate(1); now.setHours(9, 0, 0, 0); break;
    case 'quarterly': { const q = Math.floor(now.getMonth() / 3); now.setMonth((q + 1) * 3); now.setDate(1); now.setHours(9, 0, 0, 0); break; }
    case 'yearly': now.setFullYear(now.getFullYear() + 1); now.setMonth(0); now.setDate(1); now.setHours(9, 0, 0, 0); break;
    case 'custom': return null; // cron evaluation would happen server-side
    default: now.setDate(now.getDate() + 1);
  }
  return now.toISOString();
}

export async function getDueScheduledReports(): Promise<ScheduledReport[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', now);
  if (error || !data) return [];
  return data as ScheduledReport[];
}

export async function runScheduledReport(scheduled: ScheduledReport): Promise<ReportSnapshot | null> {
  const template = scheduled.template_id
    ? await supabase.from('report_templates').select('*').eq('id', scheduled.template_id).maybeSingle()
    : null;
  const reportType = (template?.data as ReportTemplate | null)?.report_type ?? 'executive';
  const datePreset = (template?.data as ReportTemplate | null)?.date_range_preset ?? 'last_30_days';
  const report = await generateReport(scheduled.business_id, reportType, datePreset);
  const snapshot = await saveReportSnapshot({
    business_id: scheduled.business_id,
    user_id: scheduled.user_id,
    template_id: scheduled.template_id,
    scheduled_report_id: scheduled.id,
    report_type: report.reportType,
    title: report.title,
    date_range_start: report.dateRange.start,
    date_range_end: report.dateRange.end,
    metrics: report.metrics,
    chart_data: report.charts,
    ai_summary: report.aiSummary as Record<string, unknown> | null,
    ai_recommendations: null,
    ai_confidence: report.aiSummary?.confidence ?? null,
    export_formats: ['pdf', 'csv'],
    file_urls: null,
    status: 'generated',
    generated_at: new Date().toISOString(),
  });
  if (snapshot) {
    await updateScheduledReport(scheduled.id, { last_run_at: new Date().toISOString() });
    for (const channel of scheduled.delivery_channels) {
      await supabase.from('report_deliveries').insert({
        business_id: scheduled.business_id,
        user_id: scheduled.user_id,
        scheduled_report_id: scheduled.id,
        snapshot_id: snapshot.id,
        channel,
        recipient: channel === 'email' ? scheduled.delivery_emails.join(', ') : scheduled.delivery_phones.join(', '),
        status: 'sent',
        delivered_at: new Date().toISOString(),
      });
    }
    await trackEvent('REPORT_GENERATED', scheduled.business_id, null, { report_type: reportType, scheduled: true });
  }
  return snapshot;
}

// ---- Track Report Download ----
export async function trackReportDownload(businessId: string, snapshotId: string, format: ExportFormat): Promise<void> {
  await logReportAction(businessId, 'report_downloaded', 'report_snapshot', snapshotId, { format });
  await trackEvent('REPORT_DOWNLOADED', businessId, null, { snapshot_id: snapshotId, format });
}
