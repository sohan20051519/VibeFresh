-- Fix Privacy Issue: Revert public access to project list
-- But keep public access to specific shared projects via RPC

-- 1. Drop the permissive policy that caused the leak
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;

-- 2. Prevent Infinite Recursion on project_members
-- We must simplify this policy because 'projects' policy depends on it.
-- If this policy checks 'projects', we get a loop.
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;
CREATE POLICY "Users can view their own memberships" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- 3. Restore strict policy: Only Owners and Members can view projects in the list
DROP POLICY IF EXISTS "Members can view projects they are in" ON public.projects;

CREATE POLICY "Members can view projects they are in" ON public.projects
    FOR SELECT USING (
        auth.uid() = user_id -- Owner
        OR 
        exists (select 1 from public.project_members where project_id = public.projects.id and user_id = auth.uid()) -- Member
    );

-- 4. Ensure get_project_public exists for public links (Preview Mode)
-- This allows fetching a SINGLE project by ID without Auth, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_project_public(p_id UUID)
RETURNS SETOF public.projects
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.projects WHERE id = p_id;
$$;
