-- Lets a family choose which founding member/couple the tree's cinematic
-- entrance zooms in on first (instead of always auto-picking by descendant
-- count). Nullable: falls back to the automatic choice when unset.
alter table public.families
  add column if not exists intro_start_member_id uuid references public.members (id) on delete set null;
