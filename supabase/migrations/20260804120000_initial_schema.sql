-- Initial schema for family-app: members, relationships, profiles,
-- invite-only signups, role-based RLS and atomic member creation.

-- ============================================================
-- Tables
-- ============================================================

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family_name text not null default '',
  birth_date date,
  photo_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

-- One row per edge. 'parent' is directed (member_a is the parent of
-- member_b); the rest are undirected and stored once with member_a < member_b.
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.members (id) on delete cascade,
  member_b uuid not null references public.members (id) on delete cascade,
  type text not null check (type in ('parent', 'partner', 'previous_partner', 'sibling')),
  created_at timestamptz not null default now(),
  unique (member_a, member_b, type),
  check (member_a <> member_b),
  check (type = 'parent' or member_a < member_b)
);

create index relationships_member_a_idx on public.relationships (member_a);
create index relationships_member_b_idx on public.relationships (member_b);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  member_id uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invited_emails (
  email text primary key,
  role_on_signup text not null default 'editor'
    check (role_on_signup in ('admin', 'editor', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Invite-only signups
-- ============================================================

-- Blocks signups from non-invited emails and creates the profile on signup.
-- Bootstrap: the very first user to sign up becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invited_emails%rowtype;
begin
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, email, role)
    values (new.id, lower(new.email), 'admin');
    return new;
  end if;

  select * into invite from public.invited_emails where email = lower(new.email);

  if invite.email is null then
    raise exception 'Signup not allowed for %: not invited', new.email;
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, lower(new.email), invite.role_on_signup);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Role helper + RLS
-- ============================================================

-- Role of the currently authenticated user (null if no profile / no session).
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.members enable row level security;
alter table public.relationships enable row level security;
alter table public.profiles enable row level security;
alter table public.invited_emails enable row level security;

-- members: family (anyone with a profile) reads; admin/editor writes.
create policy "family can read members" on public.members
  for select to authenticated
  using (public.current_user_role() is not null);

create policy "editors can insert members" on public.members
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors can update members" on public.members
  for update to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors can delete members" on public.members
  for delete to authenticated
  using (public.current_user_role() in ('admin', 'editor'));

-- relationships: same rules as members.
create policy "family can read relationships" on public.relationships
  for select to authenticated
  using (public.current_user_role() is not null);

create policy "editors can insert relationships" on public.relationships
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors can update relationships" on public.relationships
  for update to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors can delete relationships" on public.relationships
  for delete to authenticated
  using (public.current_user_role() in ('admin', 'editor'));

-- profiles: family reads all; users update their own row; admins update any.
create policy "family can read profiles" on public.profiles
  for select to authenticated
  using (public.current_user_role() is not null);

create policy "users can update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins can update any profile" on public.profiles
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (true);

-- Guards column-level rules RLS can't express: only admins change roles,
-- email is immutable. auth.uid() is null for service-role/SQL-editor access,
-- which stays allowed.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.role is distinct from old.role
       and public.current_user_role() is distinct from 'admin' then
      raise exception 'Only admins can change roles';
    end if;

    if new.email is distinct from old.email then
      raise exception 'Email cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- invited_emails: admins only.
create policy "admins manage invites" on public.invited_emails
  for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- Atomic member creation
-- ============================================================

-- payload: {
--   "name": text, "family_name": text, "birth_date": "YYYY-MM-DD" | "",
--   "relations": [ { "other": uuid, "type": "parent"|"partner"|"previous_partner"|"sibling",
--                    "direction": "parent_of"|"child_of" (only for type=parent) } ]
-- }
-- security invoker: RLS decides whether the caller may insert.
create or replace function public.add_member_with_relations(payload jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  new_id uuid;
  rel jsonb;
  other_id uuid;
begin
  insert into public.members (name, family_name, birth_date, created_by)
  values (
    payload ->> 'name',
    coalesce(payload ->> 'family_name', ''),
    nullif(payload ->> 'birth_date', '')::date,
    auth.uid()
  )
  returning id into new_id;

  for rel in select * from jsonb_array_elements(coalesce(payload -> 'relations', '[]'::jsonb))
  loop
    other_id := (rel ->> 'other')::uuid;

    if rel ->> 'type' = 'parent' then
      if rel ->> 'direction' = 'parent_of' then
        insert into public.relationships (member_a, member_b, type)
        values (new_id, other_id, 'parent')
        on conflict do nothing;
      else
        insert into public.relationships (member_a, member_b, type)
        values (other_id, new_id, 'parent')
        on conflict do nothing;
      end if;
    else
      insert into public.relationships (member_a, member_b, type)
      values (least(new_id, other_id), greatest(new_id, other_id), rel ->> 'type')
      on conflict do nothing;
    end if;
  end loop;

  return new_id;
end;
$$;

-- ============================================================
-- Storage bucket for member photos (used in a later iteration)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
