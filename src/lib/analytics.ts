import { supabase } from './supabase'

export async function trackEvent(
  eventType: string,
  businessId: string | null = null,
  sessionId: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('analytics_events').insert({
      business_id: businessId, session_id: sessionId, event_type: eventType, metadata,
    })
  } catch { /* never break user flow */ }
}

export const EventType = {
  REVIEW_PAGE_VIEWED: 'REVIEW_PAGE_VIEWED',
  RATING_SELECTED: 'RATING_SELECTED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  SESSION_SUBMITTED: 'SESSION_SUBMITTED',
  AI_REVIEW_GENERATED: 'AI_REVIEW_GENERATED',
  REVIEW_COPIED: 'REVIEW_COPIED',
  GOOGLE_REVIEW_CLICKED: 'GOOGLE_REVIEW_CLICKED',
  ERROR: 'ERROR',
} as const
