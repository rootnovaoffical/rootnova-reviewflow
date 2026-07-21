// ============================================================
// MODULE 14 — OFFLINE SUPPORT INFRASTRUCTURE
// Cache, queue, background sync, retry, conflict resolution
// ============================================================

const CACHE_PREFIX = "rf-mobile-cache:";
const QUEUE_KEY = "rf-mobile-action-queue";
const MAX_QUEUE_SIZE = 200;
const MAX_RETRIES = 5;

export interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
  status: "pending" | "syncing" | "completed" | "failed" | "conflict";
  error: string | null;
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  cached_at: string;
  ttl_minutes: number;
}

// ---- Cache ----

export function cacheSet<T>(key: string, data: T, ttlMinutes = 30): void {
  try {
    const entry: CacheEntry<T> = { key, data, cached_at: new Date().toISOString(), ttl_minutes: ttlMinutes };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch { /* quota exceeded — silently drop */ }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const ageMs = Date.now() - new Date(entry.cached_at).getTime();
    if (ageMs > entry.ttl_minutes * 60 * 1000) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheInvalidate(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

export function cacheClear(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}

// ---- Action Queue ----

export function getQueuedActions(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(actions: QueuedAction[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(actions.slice(0, MAX_QUEUE_SIZE)));
  } catch { /* quota — drop oldest */ }
}

export function enqueueAction(type: string, payload: Record<string, unknown>): QueuedAction {
  const actions = getQueuedActions();
  const action: QueuedAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_attempt_at: null,
    status: "pending",
    error: null,
  };
  actions.push(action);
  saveQueue(actions);
  return action;
}

export function updateQueuedAction(id: string, updates: Partial<QueuedAction>): void {
  const actions = getQueuedActions().map((a) => (a.id === id ? { ...a, ...updates } : a));
  saveQueue(actions);
}

export function removeQueuedAction(id: string): void {
  saveQueue(getQueuedActions().filter((a) => a.id !== id));
}

export function getPendingActions(): QueuedAction[] {
  return getQueuedActions().filter((a) => a.status === "pending" || (a.status === "failed" && a.attempts < MAX_RETRIES));
}

// ---- Sync Processor ----

export type SyncHandler = (action: QueuedAction) => Promise<{ success: boolean; conflict?: boolean; error?: string }>;

let syncInProgress = false;

export async function processSyncQueue(handler: SyncHandler): Promise<{ synced: number; failed: number; conflicts: number }> {
  if (syncInProgress) return { synced: 0, failed: 0, conflicts: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0, conflicts: 0 };

  syncInProgress = true;
  let synced = 0, failed = 0, conflicts = 0;
  const pending = getPendingActions();

  for (const action of pending) {
    updateQueuedAction(action.id, { status: "syncing", last_attempt_at: new Date().toISOString() });
    try {
      const result = await handler(action);
      if (result.success) {
        removeQueuedAction(action.id);
        synced++;
      } else if (result.conflict) {
        updateQueuedAction(action.id, { status: "conflict", error: result.error ?? "Conflict detected" });
        conflicts++;
      } else {
        updateQueuedAction(action.id, {
          status: "failed",
          attempts: action.attempts + 1,
          error: result.error ?? "Unknown error",
        });
        failed++;
      }
    } catch (err) {
      updateQueuedAction(action.id, {
        status: "failed",
        attempts: action.attempts + 1,
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  syncInProgress = false;
  return { synced, failed, conflicts };
}

// ---- Conflict Resolution ----

export type ConflictStrategy = "server_wins" | "client_wins" | "merge" | "manual";

export function resolveConflict<T>(
  serverData: T,
  clientData: T,
  strategy: ConflictStrategy,
): T {
  switch (strategy) {
    case "server_wins": return serverData;
    case "client_wins": return clientData;
    case "merge":
      return typeof serverData === "object" && serverData !== null && typeof clientData === "object" && clientData !== null
        ? { ...(serverData as Record<string, unknown>), ...(clientData as Record<string, unknown>) } as T
        : clientData;
    case "manual": return clientData;
  }
}

// ---- Low Bandwidth Mode ----

export function isLowBandwidthMode(): boolean {
  const connection = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!connection) return false;
  return connection.saveData === true || ["slow-2g", "2g", "3g"].includes(connection.effectiveType ?? "");
}

// ---- Online/Offline Detection ----

export function isOnline(): boolean {
  return navigator.onLine;
}
