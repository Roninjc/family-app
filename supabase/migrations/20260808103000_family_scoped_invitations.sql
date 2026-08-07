-- Scope invitations to a family so admin actions are explicitly per-family.

alter table public.invitations
  add column if not exists family_id uuid references public.families (id) on delete cascade;

create index if not exists invitations_family_id_idx
  on public.invitations (family_id);

-- Backfill existing invitations.
update public.invitations i
set family_id = m.family_id
from public.members m
where i.family_id is null
  and i.member_id = m.id;

update public.invitations i
set family_id = coalesce(
  (
    select fm.family_id
    from public.family_memberships fm
    where fm.profile_id = i.invited_by
    order by fm.created_at asc
    limit 1
  ),
  public.ensure_default_family()
)
where i.family_id is null;

alter table public.invitations
  alter column family_id set not null;

drop policy if exists "admins and editors can read invitations" on public.invitations;
drop policy if exists "admins and editors can insert invitations" on public.invitations;
drop policy if exists "admins and editors can update invitations" on public.invitations;
drop policy if exists "admins and editors can delete invitations" on public.invitations;

create policy "managers can read invitations in own families" on public.invitations
  for select to authenticated
  using (public.can_edit_family(family_id));

create policy "managers can insert invitations in own families" on public.invitations
  for insert to authenticated
  with check (public.can_edit_family(family_id));

create policy "managers can update invitations in own families" on public.invitations
  for update to authenticated
  using (public.can_edit_family(family_id))
  with check (public.can_edit_family(family_id));

create policy "managers can delete invitations in own families" on public.invitations
  for delete to authenticated
  using (public.can_edit_family(family_id));

create or replace function public.create_invitation(
  invitation_type text,
  invitation_family_id uuid,
  invitation_email text,
  invitation_member_id uuid,
  invitation_role text,
  invitation_expires_at timestamptz,
  invitation_max_uses integer
)
returns table (invitation_id uuid, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  raw_token text;
  created_id uuid;
  member_family_id uuid;
begin
  actor_role := public.current_user_role();

  if actor_role not in ('admin', 'editor') then
    raise exception 'Only admins and editors can create invitations';
  end if;

  if invitation_role not in ('admin', 'editor', 'viewer') then
    raise exception 'Invalid role';
  end if;

  if actor_role = 'editor' and invitation_role = 'admin' then
    raise exception 'Editors cannot invite admins';
  end if;

  if invitation_type not in ('general', 'member_linked') then
    raise exception 'Invalid invitation type';
  end if;

  if invitation_family_id is null then
    raise exception 'A family is required';
  end if;

  if not public.can_edit_family(invitation_family_id) then
    raise exception 'Cannot manage invitations for this family';
  end if;

  if invitation_type = 'member_linked' and invitation_member_id is null then
    raise exception 'A member-linked invitation requires member_id';
  end if;

  if invitation_type = 'general' and invitation_member_id is not null then
    raise exception 'General invitations cannot target a member';
  end if;

  if invitation_type = 'member_linked' and (invitation_email is null or trim(invitation_email) = '') then
    raise exception 'A member-linked invitation requires an email';
  end if;

  if invitation_max_uses is not null and invitation_max_uses <= 0 then
    raise exception 'max_uses must be positive';
  end if;

  if invitation_member_id is not null then
    select family_id into member_family_id
    from public.members
    where id = invitation_member_id;

    if member_family_id is null or member_family_id <> invitation_family_id then
      raise exception 'Member does not belong to invitation family';
    end if;
  end if;

  raw_token := gen_random_uuid()::text;

  insert into public.invitations (
    token_hash,
    family_id,
    type,
    email,
    member_id,
    role_on_signup,
    invited_by,
    expires_at,
    max_uses
  )
  values (
    encode(digest(raw_token, 'sha256'), 'hex'),
    invitation_family_id,
    invitation_type,
    invitation_email,
    invitation_member_id,
    invitation_role,
    auth.uid(),
    invitation_expires_at,
    invitation_max_uses
  )
  returning id into created_id;

  return query select created_id, raw_token;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_legacy public.invited_emails%rowtype;
  invite_email public.invitations%rowtype;
  invite_token public.invitations%rowtype;
  requested_token text;
  signup_role text;
  signup_member_id uuid;
  signup_notice text;
  signup_family_id uuid;
begin
  -- Priority 1: member-linked invitation by email.
  select *
  into invite_email
  from public.invitations
  where type = 'member_linked'
    and email = lower(new.email)
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses)
  order by created_at desc
  limit 1
  for update;

  if invite_email.id is not null then
    update public.invitations
    set uses_count = uses_count + 1,
        last_used_at = now()
    where id = invite_email.id;

    signup_role := invite_email.role_on_signup;
    signup_member_id := invite_email.member_id;
    signup_notice := null;
    signup_family_id := invite_email.family_id;

    begin
      insert into public.profiles (id, email, role, member_id, pending_notice)
      values (new.id, lower(new.email), signup_role, signup_member_id, signup_notice);

      insert into public.family_memberships (family_id, profile_id, role)
      values (signup_family_id, new.id, signup_role)
      on conflict (family_id, profile_id) do update set role = excluded.role;

      return new;
    exception
      when unique_violation then
        -- First account wins the member binding; later invitees still get access.
        insert into public.profiles (id, email, role, member_id, pending_notice)
        values (
          new.id,
          lower(new.email),
          signup_role,
          null,
          'member_link_already_claimed'
        );

        insert into public.family_memberships (family_id, profile_id, role)
        values (signup_family_id, new.id, signup_role)
        on conflict (family_id, profile_id) do update set role = excluded.role;

        return new;
    end;
  end if;

  -- Priority 2: general invitation token sent from the login form.
  requested_token := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_token', '')), '');

  if requested_token is not null then
    select *
    into invite_token
    from public.invitations
    where type = 'general'
      and token_hash = encode(digest(requested_token, 'sha256'), 'hex')
      and revoked_at is null
      and (expires_at is null or expires_at > now())
      and (max_uses is null or uses_count < max_uses)
    limit 1
    for update;

    if invite_token.id is not null then
      update public.invitations
      set uses_count = uses_count + 1,
          last_used_at = now()
      where id = invite_token.id;

      insert into public.profiles (id, email, role, member_id, pending_notice)
      values (new.id, lower(new.email), invite_token.role_on_signup, null, null);

      insert into public.family_memberships (family_id, profile_id, role)
      values (invite_token.family_id, new.id, invite_token.role_on_signup)
      on conflict (family_id, profile_id) do update set role = excluded.role;

      return new;
    end if;
  end if;

  -- Compatibility fallback: legacy invited_emails table.
  select * into invite_legacy from public.invited_emails where email = lower(new.email);

  if invite_legacy.email is null then
    raise exception 'Signup not allowed for %: not invited', new.email;
  end if;

  signup_family_id := public.ensure_default_family();

  insert into public.profiles (id, email, role, member_id, pending_notice)
  values (new.id, lower(new.email), invite_legacy.role_on_signup, null, null);

  insert into public.family_memberships (family_id, profile_id, role)
  values (signup_family_id, new.id, invite_legacy.role_on_signup)
  on conflict (family_id, profile_id) do update set role = excluded.role;

  return new;
end;
$$;
