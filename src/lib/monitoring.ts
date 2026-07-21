import { supabase } from "./supabase";
import type { MonitoringEvent, Incident, DeploymentCheck } from "./types";

export async function listMonitoringEvents(limit = 100): Promise<MonitoringEvent[]> {
  const { data, error } = await supabase
    .from("monitoring_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as MonitoringEvent[];
}

export async function createMonitoringEvent(
  input: Omit<MonitoringEvent, "id" | "created_at" | "is_resolved" | "resolved_at">
): Promise<MonitoringEvent> {
  const { data, error } = await supabase
    .from("monitoring_events")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as MonitoringEvent;
}

export async function resolveMonitoringEvent(id: string): Promise<MonitoringEvent> {
  const { data, error } = await supabase
    .from("monitoring_events")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MonitoringEvent;
}

export async function listIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Incident[];
}

export async function getIncident(id: string): Promise<Incident | null> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Incident | null;
}

export async function createIncident(
  input: {
    title: string;
    description?: string;
    severity: Incident["severity"];
    status?: Incident["status"];
    affected_services: string[];
  }
): Promise<Incident> {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      ...input,
      status: input.status ?? "investigating",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Incident;
}

export async function updateIncident(
  id: string,
  patch: Partial<Incident>
): Promise<Incident> {
  const { data, error } = await supabase
    .from("incidents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Incident;
}

export async function resolveIncident(id: string, postmortem?: string): Promise<Incident> {
  return updateIncident(id, {
    status: "resolved",
    resolved_at: new Date().toISOString(),
    postmortem: postmortem ?? null,
  });
}

export async function listDeploymentChecks(): Promise<DeploymentCheck[]> {
  const { data, error } = await supabase
    .from("deployment_checks")
    .select("*")
    .order("check_category", { ascending: true });
  if (error) throw error;
  return (data || []) as DeploymentCheck[];
}

export async function upsertDeploymentCheck(
  input: {
    check_category: string;
    check_name: string;
    status: DeploymentCheck["status"];
    notes?: string;
  }
): Promise<DeploymentCheck> {
  const { data: existing } = await supabase
    .from("deployment_checks")
    .select("id")
    .eq("check_category", input.check_category)
    .eq("check_name", input.check_name)
    .maybeSingle();

  const checked_by = (await supabase.auth.getUser()).data.user?.id ?? null;
  const checked_at = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase
      .from("deployment_checks")
      .update({ ...input, checked_at, checked_by, updated_at: checked_at })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DeploymentCheck;
  }

  const { data, error } = await supabase
    .from("deployment_checks")
    .insert({ ...input, checked_at, checked_by })
    .select("*")
    .single();
  if (error) throw error;
  return data as DeploymentCheck;
}

export interface SystemHealthSummary {
  totalEvents: number;
  unresolvedEvents: number;
  activeIncidents: number;
  recentFailures: number;
  services: Array<{ name: string; status: "healthy" | "degraded" | "down"; lastEvent: string }>;
  deploymentReadiness: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    warnings: number;
    ready: boolean;
  };
}

export async function getSystemHealth(): Promise<SystemHealthSummary> {
  const [eventsResult, unresolvedResult, incidentsResult, failuresResult, checksResult] =
    await Promise.all([
      supabase.from("monitoring_events").select("id", { count: "exact", head: true }),
      supabase
        .from("monitoring_events")
        .select("id", { count: "exact", head: true })
        .eq("is_resolved", false),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "investigating", "monitoring"]),
      supabase
        .from("monitoring_events")
        .select("service_name, created_at")
        .eq("event_type", "failure")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("deployment_checks").select("*"),
    ]);

  const services = new Map<string, { name: string; status: "healthy" | "degraded" | "down"; lastEvent: string }>();
  for (const f of (failuresResult.data || []) as Array<{ service_name: string; created_at: string }>) {
    const existing = services.get(f.service_name);
    if (!existing) {
      services.set(f.service_name, {
        name: f.service_name,
        status: "degraded",
        lastEvent: f.created_at,
      });
    }
  }

  const checks = (checksResult.data || []) as DeploymentCheck[];
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const pending = checks.filter((c) => c.status === "pending").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  return {
    totalEvents: eventsResult.count ?? 0,
    unresolvedEvents: unresolvedResult.count ?? 0,
    activeIncidents: incidentsResult.count ?? 0,
    recentFailures: (failuresResult.data || []).length,
    services: Array.from(services.values()),
    deploymentReadiness: {
      total: checks.length,
      passed,
      failed,
      pending,
      warnings,
      ready: checks.length > 0 && failed === 0 && pending === 0,
    },
  };
}
