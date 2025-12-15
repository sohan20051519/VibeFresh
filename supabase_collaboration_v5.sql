
-- 1. Create a table to track triggered emails (optional but good for logs)
create table if not exists public.email_logs (
    id uuid default gen_random_uuid() primary key,
    recipient text not null,
    subject text not null,
    status text default 'pending',
    created_at timestamp with time zone default now()
);

-- Note: Supabase cannot send emails directly from SQL without an extension like pg_net or an Edge Function.
-- Since we are sticking to frontend logic for now (using EmailJS or similar), we don't strictly *need* SQL changes for sending email.
-- However, we improved the `invite_user_to_project` in v3 to return the link.
-- The USER says "link is not send to their main" (email).
-- This means we need the FRONTEND to send the email using the link returned by the DB.

-- We also need to ensuring the project is visible to the new member.
-- The `project_members` policy is crucial.
DROP POLICY IF EXISTS "Members can view projects they are in" ON public.projects;
CREATE POLICY "Members can view projects they are in" ON public.projects
    FOR SELECT USING (
        auth.uid() = user_id -- Owner
        OR 
        exists (select 1 from public.project_members where project_id = public.projects.id and user_id = auth.uid()) -- Member
    );

-- And ensuring they can update if they are editors
DROP POLICY IF EXISTS "Editors can update projects" ON public.projects;
CREATE POLICY "Editors can update projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() = user_id
        OR 
        exists (select 1 from public.project_members where project_id = public.projects.id and user_id = auth.uid() and role = 'editor')
    );

-- Fix for JoinPage rcp call failing if not accepted
-- If `accept_project_invitation` returns success, the user is added to `project_members`.
-- Then `navigate('/built/:id')` happens.
-- `WorkspaceWrapper` tries to load project.
-- It fetches `projects` table.
-- The policy above ensures they can SEE it.

-- Ensure project_members RLS allows user to see their own membership
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;
CREATE POLICY "Users can view their own memberships" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR 
        exists (select 1 from public.projects where id = project_id and user_id = auth.uid()) -- Owner can see all members
    );
