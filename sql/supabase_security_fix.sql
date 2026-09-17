-- 1. Revert the permissive "Anyone can view" policy that broke listing isolation
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;

-- 2. Restore strict RLS for listing/selecting directly from the table
-- User sees project ONLY if they are Owner OR Member
DROP POLICY IF EXISTS "Owner or Member can view projects" ON public.projects;
CREATE POLICY "Owner or Member can view projects" ON public.projects
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    exists (select 1 from public.project_members where project_id = public.projects.id and user_id = auth.uid())
  );

-- 3. Create a Security Definer function to allow fetching a SPECIFIC project by ID publicly
-- This allows the "Published View" to work for anonymous users without exposing the entire list.
CREATE OR REPLACE FUNCTION public.get_project_public(p_id uuid)
RETURNS SETOF public.projects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.projects WHERE id = p_id;
END;
$$;
