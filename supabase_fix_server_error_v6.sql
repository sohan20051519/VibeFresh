
-- CRITICAL FIX for 500 & 406 Errors (Infinite Recursion in RLS)

-- 1. Create a Helper Function to check ownership WITHOUT triggering RLS Recusion
-- This function runs as the database owner ("SECURITY DEFINER"), bypassing RLS on the projects table.
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

-- 2. Fix 'projects' table policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view projects they are in" ON public.projects;
DROP POLICY IF EXISTS "Editors can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

-- Allow users to see projects if they are the owner OR a member
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

-- Allow users to UPDATE if they are owner OR 'editor'
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

-- Allow users to INSERT (Create) projects - Owner only initially
CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Allow users to DELETE projects - Owner only
CREATE POLICY "Owners can delete projects" ON public.projects
    FOR DELETE USING (
        auth.uid() = user_id
    );


-- 3. Fix 'project_members' table policies
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;

-- Use the Security Definer function to break the recursion loop!
CREATE POLICY "Users can view their own memberships" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR 
        public.is_project_owner(project_id)
    );

-- 4. Fix 'profiles' table permissions (Addressing the 406 Error)
-- Ensure the table exists and is accessible
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read any profile (needed for collaboration list)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Grant permissions to public/anon just in case (though we rely on auth)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
