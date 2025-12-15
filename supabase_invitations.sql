
-- 1. Create project_members table
create table if not exists project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'editor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

alter table project_members enable row level security;

-- 2. Policies for project_members
-- Allow viewing members if you are the owner OR a member
create policy "View project members" on project_members
  for select using (
    auth.uid() = user_id OR 
    exists (select 1 from projects where id = project_members.project_id and user_id = auth.uid())
  );

-- 3. Update Projects Policies to allow members to access
-- We keep the existing "Owner" policies and ADD "Member" policies.
create policy "Members can view projects" on projects
  for select using (
    exists (select 1 from project_members where project_id = projects.id and user_id = auth.uid())
  );

create policy "Members can update projects" on projects
  for update using (
    exists (select 1 from project_members where project_id = projects.id and user_id = auth.uid())
  );

-- 4. RPC Function to Invite User
create or replace function invite_user_to_project(p_email text, p_project_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_inviter_credits int;
  v_owner_id uuid;
begin
  -- Check if project exists and get owner
  select user_id into v_owner_id from projects where id = p_project_id;
  
  if v_owner_id is null then
     return json_build_object('error', 'Project not found');
  end if;
  
  -- Check if Inviter is Owner
  if v_owner_id != auth.uid() then
    return json_build_object('error', 'Only project owner can invite');
  end if;

  -- Check Credits
  select credits into v_inviter_credits from profiles where id = auth.uid();
  
  if v_inviter_credits <= 0 then
    return json_build_object('error', 'Insufficient credits. You need credits to invite collaborators.');
  end if;

  -- Find User by Email in PROFILES (publicly viewable by default RLS or just accessible here)
  select id into v_user_id from profiles where email = lower(p_email);
  
  if v_user_id is null then
    return json_build_object('error', 'User not found. The user must be signed up on VibeFresh.');
  end if;

  -- Check if already member
  if exists (select 1 from project_members where project_id = p_project_id and user_id = v_user_id) then
    return json_build_object('error', 'User is already a member');
  end if;
  
  if v_user_id = auth.uid() then
     return json_build_object('error', 'You are already the owner');
  end if;

  -- Add Member
  insert into project_members (project_id, user_id) values (p_project_id, v_user_id);

  return json_build_object('success', true, 'message', 'User added to project! They can now access it.');
end;
$$;
