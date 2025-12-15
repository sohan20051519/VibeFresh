
-- FINAL DB FIX V8: Resolving 500 Errors & Auth Joins

-- 1. DROP EVERYTHING related to these functions to clean the slate
DROP FUNCTION IF EXISTS public.get_project_collaborators(UUID);
DROP FUNCTION IF EXISTS public.invite_user_to_project(TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_project_owner(UUID) CASCADE;

-- 2. RE-APPLY SAFE POLICIES (Recursion Fix)
-- Ensure RLS is on
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Reset Policies
DROP POLICY IF EXISTS "Members can view projects they are in" ON public.projects;
DROP POLICY IF EXISTS "Editors can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;

-- Projects: Simple Owner checks for Create/Delete
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Projects: Select (Owner OR Member)
-- Checks project_members, so project_members MUST NOT check projects!
CREATE POLICY "Members can view projects they are in" ON public.projects
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = public.projects.id 
            AND user_id = auth.uid()
        )
    );

-- Projects: Update (Owner OR Editor)
CREATE POLICY "Editors can update projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = public.projects.id 
            AND user_id = auth.uid() 
            AND role = 'editor'
        )
    );

-- Project Members: NON-RECURSIVE POLICY
-- Only check if the user IS the member. 
-- Owners can't see all members via RLS with this, so they MUST use the RPC function below.
CREATE POLICY "Users can view their own memberships" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- 3. ROBUST GET COLLABORATORS FUNCTION (Fixes 500 Error)
-- We join auth.users to get the email reliably.
CREATE OR REPLACE FUNCTION public.get_project_collaborators(p_project_id UUID)
RETURNS TABLE (
  member_id UUID,
  project_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Essential to access auth.users
SET search_path = public, auth -- limit search path for security
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as member_id,
    pm.project_id,
    pm.user_id,
    pm.role,
    pm.joined_at,
    au.email::text, -- Cast to text to be sure
    COALESCE(p.full_name, 'User') as full_name -- Handle missing profile
  FROM public.project_members pm
  JOIN auth.users au ON pm.user_id = au.id
  LEFT JOIN public.profiles p ON pm.user_id = p.id
  WHERE pm.project_id = p_project_id;
END;
$$;

-- 4. RESTORE INVITE FUNCTION
CREATE OR REPLACE FUNCTION public.invite_user_to_project(
  p_email TEXT,
  p_project_id UUID,
  p_role TEXT DEFAULT 'editor',
  p_base_url TEXT DEFAULT 'http://localhost:3000'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_invite_token TEXT;
  v_existing_member UUID;
BEGIN
  -- 1. Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- User exists: Add directly
    -- Check if already member
    SELECT id INTO v_existing_member FROM public.project_members WHERE project_id = p_project_id AND user_id = v_user_id;
    IF v_existing_member IS NOT NULL THEN
      RETURN json_build_object('success', false, 'message', 'User is already a member.');
    END IF;

    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, p_role);

    RETURN json_build_object('success', true, 'status', 'added', 'message', 'User added to project directly.');
  ELSE
    -- User does not exist: Create pending invitation
    v_invite_token := encode(gen_random_bytes(16), 'hex');
    
    INSERT INTO public.pending_invitations (project_id, email, token, role)
    VALUES (p_project_id, p_email, v_invite_token, p_role);

    RETURN json_build_object(
      'success', true,
      'status', 'invited',
      'message', 'Invitation link created.',
      'invite_link', p_base_url || '/join?token=' || v_invite_token
    );
  END IF;
END;
$$;
