-- Enable public read access to projects so shared links work for everyone
-- This replaces previous restrictive policies for SELECT

-- 1. Drop existing SELECT policies on 'projects' to avoid conflicts or restrictions
DROP POLICY IF EXISTS "Members can view projects they are in" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;

-- 2. Create a new permissive SELECT policy
-- This allows any user (authenticated or anonymous) to SELECT rows from 'projects'.
-- Security relies on the UUID being known (Link Sharing).
CREATE POLICY "Anyone can view projects" ON public.projects
    FOR SELECT USING (true);
