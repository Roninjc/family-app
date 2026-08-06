-- Invitations v2: general links + member-linked invites with first-claim binding.
-- Also adds a one-time signup notice so late linked invites can still register
-- with access while explaining why they were not linked.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  type text not null check (type in ('general', 'member_linked')),
  email text,
  member_id uuid references public.members (id) on delete set null,
  role_on_signup text not null default 'viewer'
    check (role_on_signup in ('admin', 'editor', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check ((type = 'general' and member_id is null) or (type = 'member_linked' and member_id is not null)),
  check (type = 'general' or email is not null)
);

create index invitations_email_idx on public.invitations (email);
create index invitations_member_id_idx on public.invitations (member_id);
create index invitations_created_at_idx on public.invitations (created_at desc);

alter table public.invitations enable row level security;

create policy "admins and editors can read invitations" on public.invitations
  for select to authenticated
  using (public.current_user_role() in ('admin', 'editor'));

create policy "admins and editors can insert invitations" on public.invitations
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "admins and editors can update invitations" on public.invitations
  for update to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "admins and editors can delete invitations" on public.invitations
  for delete to authenticated
  using (public.current_user_role() in ('admin', 'editor'));

create or replace function public.normalize_invitation_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
  end if;

  return new;
end;
$$;

create trigger normalize_invitation_email
  before insert or update on public.invitations
  for each row execute function public.normalize_invitation_email();

create or replace function public.create_invitation(
  invitation_type text,
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

  raw_token := gen_random_uuid()::text;

  insert into public.invitations (
    token_hash,
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

alter table public.profiles
  add column if not exists pending_notice text;

create unique index if not exists profiles_member_id_unique_idx
  on public.profiles (member_id)
  where member_id is not null;

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

    begin
      insert into public.profiles (id, email, role, member_id, pending_notice)
      values (new.id, lower(new.email), signup_role, signup_member_id, signup_notice);

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

      return new;
    end if;
  end if;

  -- Compatibility fallback: legacy invited_emails table.
  select * into invite_legacy from public.invited_emails where email = lower(new.email);

  if invite_legacy.email is null then
    raise exception 'Signup not allowed for %: not invited', new.email;
  end if;

  insert into public.profiles (id, email, role, member_id, pending_notice)
  values (new.id, lower(new.email), invite_legacy.role_on_signup, null, null);

  return new;
end;
$$;