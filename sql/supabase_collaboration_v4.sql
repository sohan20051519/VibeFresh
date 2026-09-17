
-- COMPREHENSIVE FIX V4: Invitation Acceptance Logic

-- 1. Function to Accept Invitation
create or replace function public.accept_project_invitation(
  p_token text
)
returns json
language plpgsql
security definer
as $$
declare
  v_invite record;
  v_user_id uuid;
  v_project_title text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- 1. Find the invitation
  select * into v_invite from public.pending_invitations where token = p_token;
  
  if v_invite.id is null then
    return json_build_object('success', false, 'error', 'Invalid or expired invitation');
  end if;

  -- 2. Check if email matches (optional strict check, but user might sign up with different email than invited?)
  -- For better UX, we allow accepting if you have the token.
  -- But usually we want to verify email. Let's assume strict for security or loose for convenience.
  -- Let's go with LOOSE for now (token is secret), but ideally we check email.
  -- IF we want strict: join profiles and check email.
  
  -- 3. Add to members
  -- Check if already member
  if exists (select 1 from public.project_members where project_id = v_invite.project_id and user_id = v_user_id) then
     -- Just delete invite and return success
     delete from public.pending_invitations where id = v_invite.id;
     select title into v_project_title from public.projects where id = v_invite.project_id;
     return json_build_object('success', true, 'project_id', v_invite.project_id, 'project_title', v_project_title, 'message', 'Already a member');
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, v_user_id, v_invite.role);

  -- 4. Delete invitation
  delete from public.pending_invitations where id = v_invite.id;

  -- 5. Get Project Title for UI
  select title into v_project_title from public.projects where id = v_invite.project_id;

  return json_build_object(
      'success', true, 
      'project_id', v_invite.project_id, 
      'project_title', v_project_title
  );
end;
$$;
