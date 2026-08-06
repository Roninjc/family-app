# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Uses yarn (yarn.lock is present).

- `yarn dev` — start dev server (`yarn dev -- --open` to open browser)
- `yarn build` / `yarn preview` — production build (adapter-node) / preview it
- `yarn run check` — type-check with svelte-check (must be `yarn run check`; plain `yarn check` runs yarn's builtin integrity check instead).
- `yarn test` / `yarn test:watch` — Vitest. Tests live in `tests/`, mirroring the `src/` structure (config in `vitest.config.ts`, separate from vite.config; component tests run in jsdom via `// @vitest-environment jsdom`). Covers the tree engine, the DB adapter, connection-line math, treeNode rendering and the page actions.
- `yarn lint` — prettier check + eslint
- `yarn format` — prettier write
- `yarn migrate:seed` — one-time data migration of the hardcoded seed into Supabase (service role; refuses to run if members already exist unless `--force`)

## Backend (Supabase)

Family tree web app for the Castaño family, backed by a Supabase cloud project (Postgres + Auth). Requires a `.env` (see `.env.example`): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, plus server-only `SUPABASE_SERVICE_ROLE_KEY` (scripts) and `SUPABASE_DB_PASSWORD` (migrations). Never print these.

- Schema lives in `supabase/migrations/*.sql`. Apply with `supabase db push --db-url "postgresql://postgres.<ref>:<url-encoded SUPABASE_DB_PASSWORD>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"` — the session pooler must be used because the direct DB host is IPv6-only.
- Tables: `members`, `relationships` (one row per edge; `parent` is directed member_a→member_b, all other types stored once normalized member_a < member_b), `profiles` (role admin/editor/viewer, optional `member_id` linking an account to a tree node), `invited_emails`.
- Signups are invite-only: a trigger on `auth.users` rejects emails missing from `invited_emails` and otherwise creates the profile with the invited role. RLS: anyone with a profile reads; only admin/editor write; only admins manage invites/roles (a trigger blocks role changes by non-admins, but allows service-role/SQL access where `auth.uid()` is null).
- `add_member_with_relations(jsonb)` (security invoker) inserts a member plus edges atomically; it is the only write path the app uses.
- Gotcha: trigger rejections surface through supabase-js as status-500 errors whose `message` may be the literal `"{}"` — match on status, not message (see `friendlyAuthError` in `src/routes/login/+page.server.ts`).

## Auth flow

- `src/hooks.server.ts` creates a per-request Supabase client (`@supabase/ssr`, cookies) and an auth guard: no session → redirect to `/login` (except `/login`, `/auth/*`). `locals.safeGetSession()` validates the JWT via `getUser()`.
- `/login` offers magic link (`signInWithOtp` → `/auth/confirm` verifies token_hash), email+password, and Google OAuth (`/auth/callback` code exchange; provider not yet configured in the dashboard). Supabase links identities sharing a verified email into one user.
- `src/routes/+layout.server.ts` exposes `session` + `profile` to all pages; `+layout.svelte` listens to `onAuthStateChange` and invalidates `supabase:auth`.
- `/profile` (footer ♟ button): display name, optional password creation, logout, link to `/admin`. `/admin` (admins only): invite emails with a role, revoke invites, change user roles.
- Role gating in UI uses `canEdit()` from `src/lib/types/auth.ts` (viewers don't see the add button), but real enforcement is RLS.

## Tree rendering data flow

1. `src/routes/+page.server.ts` load fetches `members` + `relationships` and `rowsToFamilyData()` (`src/lib/server/familyAdapter.ts`) rebuilds the in-app `FamilyData` shape (bidirectional relation arrays, ids are uuids).
2. `src/routes/+page.svelte` calls `initTreeData(data.familyData)` reactively, which rebuilds the graph and bumps `treeVersion`; the `{#key $treeVersion}` block re-mounts the tree and the page re-centers the scroll. `ssr = false` in `+page.ts` (tree measures DOM).
3. `src/stores/tree.ts` — the tree engine. `familyTree` is an adjacency-list graph (Map of node id → relations Map) with `Relation` enum weights (Child=1, Parent, Sibling, Partner, PreviousPartner); Child/Parent edges auto-insert their inverse. DFS traversals cover **every connected component** and compute `generations` (oldest = 1, normalized per component), `parentsChildrenArray` (couples + common children) and `renderRoots` — the page renders one `TreeNode` per root, because the recursive render only walks downward (never Parent edges): the main family first, then in-law ancestors / disconnected components as extra side-by-side trees. These are mutable `export let` bindings reassigned on rebuild. `visitedMembers`/`stack` writable stores coordinate the recursive render so each member renders once (Parent relatives are deliberately never pushed to `stack` — stale entries would block their render as extra roots).
4. `src/components/treeNode.svelte` renders recursively by **generation clusters**: each node claims a fixed-height badges row (all connected same-level relatives chained: previous partners left, member, partner, siblings — `claimRow()`) plus a single children row holding every child of anyone in the row (recursive `svelte:self`). Because badges never nest inside variable-height contexts, every generation lands in its own horizontal band. Pair lines are drawn once per couple (partner lines from the left member, ex lines from the right one, which owns the stagger). Connection lines are only drawn to children rendered in that cluster (a child already rendered in another branch keeps its badge there). `addFamilyMemberModal.svelte` is a 4-step form that POSTs to the `?/addMember` action (hidden inputs on the summary step, `use:enhance`, `invalidateAll` on success re-renders the tree); it includes a "Hijos" field (existing members as children of the new one → RPC `parent_of` direction) so ancestors can be added, and the action also inserts a father↔mother `partner` edge if none exists, since children only get lines under a linked couple. Derivable-but-not-certain relations (siblings of a selected child as probable children — wrong for half-siblings) are never auto-written: `suggestedChildren()` in `src/lib/utils/relationSuggestions.ts` feeds one-click confirmation chips in both modals. Clicking a member badge opens `editMemberModal.svelte` (`editingMemberId`/`showEditMemberModal` stores): viewers see read-only details; editors can update name/family name/birth date (`?/updateMember`), delete the member (`?/deleteMember`, relationships cascade via FK), and add/remove individual relations via `relationChipsEditor.svelte` (one instance per kind; each change POSTs `?/addRelation`/`?/removeRelation` immediately — `relationRow()` in `+page.server.ts` maps the member-perspective kind, including 'child', to the normalized table row — then `invalidateAll` re-renders the tree with the modal still open).
5. `src/components/connectionLines.svelte` measures rendered DOM boxes on mount (member badge DOM ids are member uuids) relative to the node's `couple-wrapper`, and `src/lib/utils/connectionLines.ts` turns those measured points into `LineSpec`s (absolutely-positioned SVG rect + path) — pure functions, no assumptions about badge sizes or gaps. Previous partners with no common children get a dashed line. Horizontal line heights are clamped to the first inter-generation gap (70px) even if a child measures further down. Window resize re-mounts the tree (debounced `treeVersion` bump in `+page.svelte`) to re-measure.

## Deploy

Runs on the owner's home server (docker compose + Cloudflare Tunnel). `Dockerfile` is multi-stage; PUBLIC_ env vars are inlined at **build** time (`$env/static/public`), passed as build args — see `docker-compose.example.yml`. `ORIGIN` env var must match the public URL or form actions fail CSRF checks.

## Other notes

- Svelte 4 (not Svelte 5 runes) + TypeScript + SCSS.
- `Relation` enum is defined twice: in `src/lib/types/familyTypes.d.ts` (exported) and duplicated privately in `src/stores/tree.ts`. Keep them in sync.
- Shared types live in `src/lib/types/familyTypes.d.ts`.
- `src/lib/data/seedFamily.ts` is the original hardcoded family — only used by `scripts/migrate-seed.ts` now; the app reads exclusively from Supabase.
- `src/components/liquidGlassWrapper.svelte` provides the "Liquid Glass" visual effect (SVG turbulence filter + layered divs) used by modals/cards; wrap content in it via slot.
- Test users may exist in Supabase (`familia.castano.test.*@gmail.com`, passwords in gitignored `scripts/.tmp-*`); delete them before inviting real family.
- Some code comments and all user-facing new UI text are in Spanish.

## Style

Prettier is enforced: no semicolons, single quotes, no trailing commas, 100-char width, 2-space indent (existing `.svelte`/`.ts` files follow this even though some root config files use tabs).
