
-- FINAL RECURSION FIX V7
-- We are simplifying the policies to completely avoid the infinite loop between projects and project_members.

-- 1. Helper function (still useful, but we won't rely on it for the recursion-prone policy)
DROP FUNCTION IF EXISTS public.is_project_owner(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = p_project_id 
    AND user_id = auth.uid()
  );
$$;

-- 2. RESET 'projects' POLICIES
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view projects they are in" ON public.projects;
DROP POLICY IF EXISTS "Editors can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;

-- Simple Owner Policy
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- VIEW: Owner OR Member
-- This relies on checking project_members.
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

-- UPDATE: Owner OR Editor
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

-- 3. RESET 'project_members' POLICIES (THE KEY FIX)
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;

-- RECURSION KILLER: 
-- We allow users to see ONLY their own row in project_members.
-- We DO NOT check 'is_project_owner' here.
-- This prevents the loop: projects -> project_members -> projects.
-- Owners will rely on the RPC function 'get_project_collaborators' to view the full list.
CREATE POLICY "Users can view their own memberships" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- 4. Ensure RPC exists and is robust (for Owners to see lists)
DROP FUNCTION IF EXISTS public.get_project_collaborators(UUID);
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
SECURITY DEFINER -- Bypasses RLS
AS $$
BEGIN
  -- Perform join to get email/name from profiles or auth.users (if possible, but usually profiles)
  RETURN QUERY
  SELECT 
    pm.id as member_id,
    pm.project_id,
    pm.user_id,
    pm.role,
    pm.joined_at,
    p.username as email, -- Fallback to username if email not in profiles, assuming username holds email or similar
    p.full_name
  FROM public.project_members pm
  LEFT JOIN public.profiles p ON pm.user_id = p.id
  WHERE pm.project_id = p_project_id;
END;
$$;
