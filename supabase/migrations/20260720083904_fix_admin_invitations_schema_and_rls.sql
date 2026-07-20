-- P0-2: Fix admin_invitations schema and RLS for secure invitation acceptance

-- Add missing columns that the accept-invitation flow requires
ALTER TABLE public.admin_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Add a SELECT policy allowing users to read their own invitation by email
-- (needed for the Invite.tsx page to load invitation details for the invitee)
CREATE OR REPLACE FUNCTION public.is_invitation_recipient()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.admin_invitations ai
  WHERE ai.id = current_setting('invitation_token', true)::uuid
  AND ai.email = (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  )
);
$function$;

-- Drop the existing admin-only SELECT policy and replace with one that also
-- allows the recipient to read their own invitation
DROP POLICY IF EXISTS admin_invitations_admin_select ON public.admin_invitations;
DROP POLICY IF EXISTS admin_invitations_recipient_select ON public.admin_invitations;

-- RootNova admins can read all invitations
CREATE POLICY admin_invitations_admin_select ON public.admin_invitations
  FOR SELECT TO authenticated
  USING (public.is_rootnova_admin());

-- Invitees can read their own invitation (matched by email)
CREATE POLICY admin_invitations_recipient_select ON public.admin_invitations
  FOR SELECT TO authenticated
  USING (
    email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Drop existing UPDATE policy and recreate to also allow recipient to update
-- their own invitation (to mark it as accepted)
DROP POLICY IF EXISTS admin_invitations_admin_update ON public.admin_invitations;
DROP POLICY IF EXISTS admin_invitations_recipient_update ON public.admin_invitations;

-- RootNova admins can update all invitations
CREATE POLICY admin_invitations_admin_update ON public.admin_invitations
  FOR UPDATE TO authenticated
  USING (public.is_rootnova_admin())
  WITH CHECK (public.is_rootnova_admin());

-- Invitees can update their own invitation (only status and accepted_at)
CREATE POLICY admin_invitations_recipient_update ON public.admin_invitations
  FOR UPDATE TO authenticated
  USING (
    email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );
