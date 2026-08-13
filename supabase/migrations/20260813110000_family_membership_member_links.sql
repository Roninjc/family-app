-- Move member bindings to family memberships so each user can link a
-- different member in each family they belong to.

alter table public.family_memberships
  add column if not exists member_id uuid references public.members (id) on delete set null;

create index if not exists family_memberships_member_idx
  on public.family_memberships (member_id);

create unique index if not exists family_memberships_family_member_unique_idx
  on public.family_memberships (family_id, member_id)
  where member_id is not null;

-- Backfill existing bindings from profiles.member_id into the corresponding
-- family membership row (members are already family-scoped).
update public.family_memberships fm
set member_id = p.member_id
from public.profiles p
join public.members m on m.id = p.member_id
where fm.profile_id = p.id
  and fm.family_id = m.family_id
  and fm.member_id is null;

-- Keep invitation signups writing the family-scoped binding directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
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

      insert into public.family_memberships (family_id, profile_id, role, member_id)
      values (signup_family_id, new.id, signup_role, signup_member_id)
      on conflict (family_id, profile_id) do update
        set role = excluded.role,
            member_id = excluded.member_id;

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

        insert into public.family_memberships (family_id, profile_id, role, member_id)
        values (signup_family_id, new.id, signup_role, null)
        on conflict (family_id, profile_id) do update
          set role = excluded.role;

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
      and token_hash = encode(digest(convert_to(requested_token, 'UTF8'), 'sha256'::text), 'hex')
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

      insert into public.family_memberships (family_id, profile_id, role, member_id)
      values (invite_token.family_id, new.id, invite_token.role_on_signup, null)
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

  insert into public.family_memberships (family_id, profile_id, role, member_id)
  values (signup_family_id, new.id, invite_legacy.role_on_signup, null)
  on conflict (family_id, profile_id) do update set role = excluded.role;

  return new;
end;
$$;
