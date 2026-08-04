-- Replaces the "first user to sign up becomes admin" bootstrap, which was a
-- race anyone could win, with a deterministic pre-invited admin email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invited_emails%rowtype;
begin
  select * into invite from public.invited_emails where email = lower(new.email);

  if invite.email is null then
    raise exception 'Signup not allowed for %: not invited', new.email;
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, lower(new.email), invite.role_on_signup);

  return new;
end;
$$;

-- Bootstrap admin invite (app owner).
insert into public.invited_emails (email, role_on_signup)
values ('jesus.candela@aller.com', 'admin')
on conflict (email) do update set role_on_signup = 'admin';
