
-- V9 FIX: Simplified Function to debug 500 Error

-- 1. Simplify get_project_collaborators
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
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as member_id,
    pm.project_id,
    pm.user_id,
    pm.role,
    pm.joined_at,
    (SELECT email::text FROM auth.users WHERE id = pm.user_id) as email, -- Correlated subquery is safer than join if permissions are weird
    (SELECT full_name FROM public.profiles WHERE id = pm.user_id) as full_name
  FROM public.project_members pm
  WHERE pm.project_id = p_project_id;
END;
$$;

-- 2. Ensure Profiles Table Exists (Handling 406 Error)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Explicit Grant (Just in case)
GRANT EXECUTE ON FUNCTION public.get_project_collaborators(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_collaborators(UUID) TO service_role;
