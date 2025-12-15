
-- COMPREHENSIVE FIX: Profiles, Invitations, Roles, and Missing Users

-- 1. Ensure PROFILES table exists (Fixing "relation profiles does not exist")
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  email text,
  full_name text,
  avatar_url text,
  credits int default 10
);

-- Re-enable RLS on profiles to be safe
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- 2. Create PENDING INVITATIONS table (For users not yet on VibeFresh)
create table if not exists public.pending_invitations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  email text not null,
  role text default 'editor', -- 'viewer' or 'editor'
  token text default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, email)
);

alter table public.pending_invitations enable row level security;

-- Policy: Project owners can convert/view pending invitations
create policy "Owners can view pending invites" on public.pending_invitations
  for select using (
    exists (select 1 from public.projects where id = project_id and user_id = auth.uid())
  );

create policy "Owners can insert pending invites" on public.pending_invitations
  for insert with check (
    exists (select 1 from public.projects where id = project_id and user_id = auth.uid())
  );

create policy "Owners can delete pending invites" on public.pending_invitations
  for delete using (
    exists (select 1 from public.projects where id = project_id and user_id = auth.uid())
  );


-- 3. Robust Invitation Function (Handles both existing and new users)
create or replace function public.invite_user_to_project(
  p_email text, 
  p_project_id uuid,
  p_role text default 'editor'
)
returns json
language plpgsql
security definer -- Runs as admin to look up users safely
as $$
declare
  v_user_id uuid;
  v_owner_id uuid;
  v_invite_token text;
begin
  -- 1. Check Project Ownership
  select user_id into v_owner_id from public.projects where id = p_project_id;
  
  if v_owner_id is null then
     return json_build_object('error', 'Project not found');
  end if;
  
  if v_owner_id != auth.uid() then
    return json_build_object('error', 'Only the project owner can invite collaborators');
  end if;

  -- 2. Check if user already exists in VibeFresh
  select id into v_user_id from public.profiles where email = lower(p_email);

  IF v_user_id IS NOT NULL THEN
    -- A. User Exists: Add to project_members immediately
    
    -- Check uniqueness
    if exists (select 1 from public.project_members where project_id = p_project_id and user_id = v_user_id) then
        return json_build_object('error', 'User is already a member');
    end if;

    insert into public.project_members (project_id, user_id, role)
    values (p_project_id, v_user_id, p_role);

    return json_build_object(
      'success', true, 
      'status', 'added',
      'message', 'User added to project immediately.'
    );

  ELSE
    -- B. User Does NOT Exist: Create Pending Invitation
    
    -- Check if invite already pending
    if exists (select 1 from public.pending_invitations where project_id = p_project_id and email = lower(p_email)) then
        return json_build_object('error', 'Invitation already sent to this email');
    end if;

    insert into public.pending_invitations (project_id, email, role, invited_by)
    values (p_project_id, lower(p_email), p_role, auth.uid())
    returning token into v_invite_token;

    return json_build_object(
      'success', true,
      'status', 'invited',
      'message', 'Invitation link created. User is not on VibeFresh yet.',
      'invite_link', 'https://vibefresh.app/join?token=' || v_invite_token
    );
  END IF;
end;
$$;


-- 4. Function to Fetch All Collaborators (Members + Pending)
create or replace function public.get_project_collaborators(p_project_id uuid)
returns table (
  id uuid,
  type text, -- 'member' or 'active' vs 'pending'
  email text,
  name text,
  avatar text,
  role text,
  is_owner boolean
)
language plpgsql
security definer
as $$
begin
  -- 1. Fetch Active Members (joined with profiles)
  return query
  select 
    pm.id as id,
    'member' as type,
    p.email as email,
    p.full_name as name,
    p.avatar_url as avatar,
    pm.role as role,
    (prj.user_id = p.id) as is_owner
  from public.project_members pm
  join public.profiles p on pm.user_id = p.id
  join public.projects prj on pm.project_id = prj.id
  where pm.project_id = p_project_id

  UNION ALL

  -- 2. Fetch Pending Invitations
  select
    pi.id as id,
    'pending' as type,
    pi.email as email,
    'Pending Invite' as name,
    null as avatar,
    pi.role as role,
    false as is_owner
  from public.pending_invitations pi
  where pi.project_id = p_project_id;
end;
$$;


-- 5. Helper Function for Updating Roles or Removing Members
create or replace function public.manage_project_member(
  p_project_id uuid,
  p_member_id uuid, -- ID from project_members OR pending_invitations table
  p_action text, -- 'update_role' or 'remove'
  p_type text,   -- 'member' or 'pending'
  p_new_role text default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_owner_id uuid;
begin
  -- Verify Owner
  select user_id into v_owner_id from public.projects where id = p_project_id;
  if v_owner_id != auth.uid() then
    raise exception 'Not authorized';
  end if;

  if p_action = 'remove' then
      if p_type = 'member' then
          delete from public.project_members where id = p_member_id;
      else
          delete from public.pending_invitations where id = p_member_id;
      end if;
  elsif p_action = 'update_role' then
      if p_type = 'member' then
          update public.project_members set role = p_new_role where id = p_member_id;
      else
          update public.pending_invitations set role = p_new_role where id = p_member_id;
      end if;
  end if;
  
  return true;
end;
$$;
