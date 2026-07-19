-- Enable realtime on tables used by frontend realtime subscriptions and
-- tables whose changes should propagate to connected clients.
-- Realtime publication already exists (supabase_realtime); add tables to it.

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.platform_assets,
  public.feature_flags,
  public.businesses,
  public.organizations,
  public.profiles,
  public.payments,
  public.review_sessions,
  public.admin_invitations,
  public.organization_members,
  public.business_admins,
  public.questions,
  public.audit_logs,
  public.plans,
  public.subscriptions;
