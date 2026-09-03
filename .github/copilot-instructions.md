# Copilot Instructions for `family-app`

## Build, test, lint

Use Yarn (the repo is Yarn-based and has `yarn.lock`).

- Install deps: `yarn install`
- Dev server: `yarn dev` (`yarn dev -- --open` to open browser)
- Mock-mode dev server (no auth, mock family data): `yarn dev:mock`
- Production build: `yarn build`
- Preview build: `yarn preview`
- Type-check: `yarn run check`  
  (`yarn check` is Yarn’s builtin command, not `svelte-check`)
- Lint: `yarn lint`
- Format: `yarn format`
- Full tests: `yarn test`
- Single test file: `yarn test tests/stores/tree.test.ts`
- Filtered tests by name: `yarn test -t "relationRow"`

## High-level architecture

This is a SvelteKit + Supabase family tree app with invite-only auth and role-gated editing.

1. **Auth and request context**

   - `src/hooks.server.ts` creates a per-request Supabase SSR client.
   - `locals.safeGetSession()` validates auth via `supabase.auth.getUser()`.
   - Unauthenticated users are redirected to `/login` (except `/login` and `/auth/*`), unless mock mode is enabled.
   - `src/routes/+layout.server.ts` loads `profile`, available families, and persists active family selection via cookie.

2. **Data loading and write paths**

   - Main page server load (`src/routes/+page.server.ts`) fetches members + relationships and converts rows using `rowsToFamilyData()` (`src/lib/server/familyAdapter.ts`).
   - Mutations are SvelteKit form actions in `+page.server.ts` (`addMember`, `updateMember`, `deleteMember`, `addRelation`, `removeRelation`).
   - New-member insertion uses RPC `add_member_with_relations`; permissions are ultimately enforced by Supabase RLS.

3. **Tree engine and rendering**

   - `src/stores/tree.ts` builds an adjacency-list graph and computes:
     - generation levels
     - couple/children groups
     - render roots for each connected component/downward-reachable tree
   - `src/routes/+page.svelte` calls `initTreeData(...)`, remounts tree on `treeVersion`, and recenters layout.
   - `src/components/treeNode.svelte` recursively renders generation rows by clustering same-level relatives before rendering children.
   - `src/routes/+page.ts` sets `ssr = false` because layout/line drawing depends on browser DOM measurement.

4. **Family grouping / active family selection**
   - `src/lib/server/familyGroups.ts` builds connected family groups and resolves active family ID from URL param/cookie fallback.
   - Active family state is persisted via `ACTIVE_FAMILY_COOKIE`.

## Key conventions

- **Mock mode for UI/layout work**: prefer `yarn dev:mock`; it bypasses auth and reads from `src/lib/data/mockFamily.ts`. Mutating actions are not mocked and will fail with RLS in this mode.
- **Relationship row normalization**:
  - `parent` is directional (`member_a -> member_b`).
  - `partner`, `previous_partner`, and `sibling` are stored once with canonical ordering (`member_a < member_b`).
  - Keep this invariant when editing relation logic (`relationRow` in `src/routes/+page.server.ts`).
- **Role checks**:
  - UI capability checks use `canEdit()` (`src/lib/types/auth.ts`).
  - Real authorization is in Supabase RLS policies/triggers.
- **Tree internals**:
  - `Relation` enum exists in shared types and a duplicated local enum in `src/stores/tree.ts`; keep both in sync when changing relationship semantics.
  - Rendering is intentionally downward-only from selected roots; do not assume a single-root tree.
- **Language convention**: code/comments/tests in English; user-facing UI copy in Spanish.
- **Tooling convention**: Svelte 4 patterns (not Svelte 5 runes), TypeScript + SCSS, Prettier style (no semicolons, single quotes, no trailing commas, 100-char width).
