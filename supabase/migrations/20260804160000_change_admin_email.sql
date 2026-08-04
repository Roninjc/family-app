-- The app owner prefers their personal email as the bootstrap admin.
delete from public.invited_emails where email = 'jesus.candela@aller.com';

insert into public.invited_emails (email, role_on_signup)
values ('jesus.castanocandela@gmail.com', 'admin')
on conflict (email) do update set role_on_signup = 'admin';
