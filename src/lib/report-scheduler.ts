import { supabase } from './supabase';
import { calculateNextRun, runScheduledReport } from './reporting';
import type { ReportFrequency, ScheduledReport } from './types';

export const frequencyOptions: { value: ReportFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day at 9:00 AM' },
  { value: 'weekly', label: 'Weekly', description: 'Every Monday at 9:00 AM' },
  { value: 'monthly', label: 'Monthly', description: '1st of every month at 9:00 AM' },
  { value: 'quarterly', label: 'Quarterly', description: 'First day of each quarter at 9:00 AM' },
  { value: 'yearly', label: 'Yearly', description: 'January 1st at 9:00 AM' },
  { value: 'custom', label: 'Custom', description: 'Custom cron expression' },
];

export function formatNextRun(nextRunAt: string | null): string {
  if (!nextRunAt) return 'Not scheduled';
  const date = new Date(nextRunAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return 'Overdue';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
  return 'Within an hour';
}

export async function processDueReports(): Promise<{ processed: number; failed: number }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', now);

  if (error || !data || data.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const sched of data as ScheduledReport[]) {
    try {
      const snapshot = await runScheduledReport(sched);
      if (snapshot) {
        processed++;
        const nextRun = calculateNextRun(sched.frequency, sched.custom_cron);
        await supabase.from('scheduled_reports').update({
          last_run_at: now,
          next_run_at: nextRun,
          retry_count: 0,
        }).eq('id', sched.id);
      } else {
        failed++;
        await incrementRetry(sched);
      }
    } catch {
      failed++;
      await incrementRetry(sched);
    }
  }

  return { processed, failed };
}

async function incrementRetry(sched: ScheduledReport): Promise<void> {
  const newRetryCount = sched.retry_count + 1;
  const shouldDeactivate = newRetryCount >= sched.max_retries;
  const nextDelay = Math.min(3600 * 1000 * Math.pow(2, newRetryCount), 24 * 3600 * 1000);
  const nextRun = new Date(Date.now() + nextDelay).toISOString();
  await supabase.from('scheduled_reports').update({
    retry_count: newRetryCount,
    is_active: !shouldDeactivate,
    next_run_at: nextRun,
  }).eq('id', sched.id);
}

export async function pauseScheduledReport(id: string): Promise<boolean> {
  const { error } = await supabase.from('scheduled_reports').update({ is_active: false }).eq('id', id);
  return !error;
}

export async function resumeScheduledReport(id: string, frequency: ReportFrequency, customCron: string | null): Promise<boolean> {
  const nextRun = calculateNextRun(frequency, customCron);
  const { error } = await supabase.from('scheduled_reports').update({
    is_active: true,
    next_run_at: nextRun,
    retry_count: 0,
  }).eq('id', id);
  return !error;
}

export async function getSchedulerStatus(businessId: string): Promise<{
  total: number;
  active: number;
  overdue: number;
  nextRun: string | null;
}> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('business_id', businessId);
  if (error || !data) return { total: 0, active: 0, overdue: 0, nextRun: null };

  const all = data as ScheduledReport[];
  const now = new Date().toISOString();
  const active = all.filter((s) => s.is_active);
  const overdue = active.filter((s) => s.next_run_at && s.next_run_at <= now);
  const upcoming = active
    .filter((s) => s.next_run_at && s.next_run_at > now)
    .sort((a, b) => (a.next_run_at ?? '').localeCompare(b.next_run_at ?? ''));

  return {
    total: all.length,
    active: active.length,
    overdue: overdue.length,
    nextRun: upcoming[0]?.next_run_at ?? null,
  };
}
