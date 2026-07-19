import { supabase } from "./supabase";

export type RealtimeCallback = (payload: unknown) => void;

export function subscribe(channelName: string, table: string, callback: RealtimeCallback, filter?: string) {
  let channel = supabase.channel(channelName);
  const opts: Record<string, unknown> = { event: "*", schema: "public", table };
  if (filter) opts.filter = filter;
  channel = (channel as unknown as { on: (type: string, opts: unknown, cb: (p: unknown) => void) => typeof channel })
    .on("postgres_changes", opts, callback).subscribe();
  return channel;
}

export function unsubscribe(channel: { unsubscribe: () => void } | null) {
  if (channel) channel.unsubscribe();
}
