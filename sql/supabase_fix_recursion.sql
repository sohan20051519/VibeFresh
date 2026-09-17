
-- FIX 500 Error caused by Infinite Recursion in RLS Policies

-- 1. Create a helper function to check ownership without triggering RLS recursion
create or replace function public.is_project_owner(project_id uuid)
returns boolean
language sql
security definer -- key: runs as superuser/creator, bypassing RLS on 'projects' table
as $$
  select exists (
    select 1 
    from projects 
    where id = project_id 
    and user_id = auth.uid()
  );
$$;

-- 2. Drop the problematic recursive policy
drop policy if exists "View project members" on project_members;

-- 3. Create a new, safe policy using the helper function
create policy "View project members by owner or self" on project_members
  for select using (
    auth.uid() = user_id -- You are the member
    OR 
    is_project_owner(project_id) -- You are the owner (checked safely)
  );

-- 4. Ensure 'messages' column exists (just in case)
alter table projects add column if not exists messages jsonb;

-- 5. Ensure 'project_members' exists (just in case)
create table if not exists project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'editor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- Re-enable RLS just to be sure
alter table project_members enable row level security;
alter table projects enable row level security;
