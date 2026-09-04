# Component Architecture Audit and Unification

## Scope analyzed

- `src/components/*.svelte`
- `src/routes/**/*.svelte` (layout, admin, login, profile, dashboard, family feed, tree page)

## Main findings

1. Modals had duplicated shell logic (`backdrop`, `Escape`, dialog wrapper, width/scroll rules).
2. Gear icon SVG was duplicated across tree and admin UIs.
3. Filter chip groups were duplicated across Admin and dashboard content.
4. Header wrappers (`SurfaceWrapper` + repeated shell/content markup) were duplicated across pages.
5. Some component styles were too coupled to local wrappers, reducing reuse.

## Refactor applied

1. Added reusable modal primitive:

   - `src/components/ui/modalShell.svelte`
   - Handles: open/close, backdrop click, `Escape`, role/aria attributes, shared shell sizing.
   - Size variants: `compact`, `default`, `wide`.

2. Added reusable icon primitive:

   - `src/components/icons/gearIcon.svelte`
   - Replaces duplicated inline SVG paths.

3. Extracted Admin modal components:

   - `src/components/admin/usersConfirmModal.svelte`
   - `src/components/admin/familySettingsModal.svelte`
   - Both use `ModalShell` internally.

4. Migrated tree modals to `ModalShell`:

   - `addFamilyMemberModal`
   - `editMemberModal`

5. Added reusable page header primitive:

   - `src/components/ui/pageHeader.svelte`
   - Migrated Admin, dashboard, feed, and Profile page headers.

6. Added reusable chip toggle primitive:

   - `src/components/ui/chipToggleGroup.svelte`
   - Migrated filters in Admin (invites) and dashboard content (notes).

7. Added shared global visual primitives in layout:

   - chips, stat tiles/grids, soft cards, autocomplete suggestion lists, page header shell/content classes.

8. Unified gear trigger icon usage:

   - Tree member edit modal uses `GearIcon`.
   - Admin family settings trigger uses `GearIcon`.

9. Extracted reusable member autocomplete suggestions:

   - `src/components/ui/memberAutocompleteSuggestions.svelte`
   - Migrated repeated suggestions in `addFamilyMemberModal` and `relationChipsEditor`.

10. Split dashboard family panel internals into reusable feature components:

- `src/components/feed/familyPreviewCard.svelte`
- `src/components/feed/familyNotesCard.svelte`
- `src/routes/dashboard/+page.svelte` now orchestrates state and delegates section rendering.

11. Split Admin family scope carousel into a dedicated component:

- `src/components/admin/familyScopeCarousel.svelte`
- `src/routes/admin/+page.svelte` keeps ownership of family switch state and handlers.

12. Split Admin management sections into dedicated panels:

- `src/components/admin/usersManagementPanel.svelte`
- `src/components/admin/issuedInvitesPanel.svelte`
- `src/routes/admin/+page.svelte` keeps business logic and delegates section rendering.

13. Split Admin invite creation forms into dedicated panels:

- `src/components/admin/generalInvitePanel.svelte`
- `src/components/admin/memberInvitePanel.svelte`
- `src/routes/admin/+page.svelte` keeps section toggling and transient copy-feedback state.

14. Unified Admin section chrome into a shared collapsible container:

- `src/components/admin/collapsibleAdminSection.svelte`
- Used by general invite, member invite, issued invites, and users sections.

15. Centralized Admin panel contracts in shared type module:

- `src/components/admin/types.ts`
- Reused by family carousel and extracted invite/users panels.

16. Typed Admin route state explicitly:

- `src/routes/admin/+page.svelte` now types `data`/`form` using `PageData` and `ActionData` from `./$types`.
- Internal helpers now consume shared Admin contracts instead of ad-hoc inline object shapes.

17. Typed dashboard route and extracted panels with shared contracts:

- `src/components/feed/types.ts` centralizes dashboard notes/family/form contracts.
- `src/routes/dashboard/+page.svelte` now uses explicit typed `data` (as `Pick<PageData, ...>`) and typed action-form state.
- `src/components/feed/familyNotesCard.svelte` and `src/components/feed/familyPreviewCard.svelte` reuse shared dashboard contracts.

18. Standardized Admin panel component APIs:

- Callbacks use concise `on<Action>` names (`onCopyLink`, `onFilterChange`, `onRoleChange`, `onMemberChange`, `onOpenConfirm`).
- Status props now follow consistent message/count naming (`successMessage`, `errorMessage`, `changesCount`, `successCount`).

19. Aligned dashboard panel API naming with Admin conventions:

- `src/components/feed/familyNotesCard.svelte` now uses normalized names for callbacks/state props (`onCreateToggle`, `onEditStart`, `onEditCancel`, `filter`, `filterOptions`, `creatingFamilyId`, `editingId`, `titleDraft`, `bodyDraft`, `typeDraft`).
- `src/routes/dashboard/+page.svelte` wiring updated to match the normalized API.

20. Standardized dashboard status feedback contract:

- `src/components/feed/familyNotesCard.svelte` now receives explicit status props (`created`, `updated`, `deleted`, `errorMessage`) instead of coupling to the raw action `form` payload.
- `src/routes/dashboard/+page.svelte` maps action form data to per-family status via a dedicated helper.

21. Aligned dashboard page internal state/handlers with panel vocabulary:

- `src/routes/dashboard/+page.svelte` now uses matching local names (`creatingFamilyId`, `editingId`, `titleDraft`, `bodyDraft`, `typeDraft`, `startEdit`, `cancelEdit`, `toggleCreateComposer`) to reduce adapter indirection.

22. Harmonized filter-empty UX copy across Admin/dashboard:

- Dashboard notes empty-filter message now matches Admin wording (`No hay resultados para este filtro.`).

## Current reusable primitives

- Surface container: `src/components/surfaceWrapper.svelte`
- Modal shell: `src/components/ui/modalShell.svelte`
- Page header shell: `src/components/ui/pageHeader.svelte`
- Chip toggle group: `src/components/ui/chipToggleGroup.svelte`
- Member autocomplete suggestions: `src/components/ui/memberAutocompleteSuggestions.svelte`
- Shared buttons and input patterns: global styles in `src/routes/+layout.svelte`
- Gear icon: `src/components/icons/gearIcon.svelte`
- Admin modal components: `src/components/admin/usersConfirmModal.svelte`, `src/components/admin/familySettingsModal.svelte`
- Admin family scope: `src/components/admin/familyScopeCarousel.svelte`
- Admin users panel: `src/components/admin/usersManagementPanel.svelte`
- Admin issued invites panel: `src/components/admin/issuedInvitesPanel.svelte`
- Admin general invite panel: `src/components/admin/generalInvitePanel.svelte`
- Admin member invite panel: `src/components/admin/memberInvitePanel.svelte`
- Admin collapsible section shell: `src/components/admin/collapsibleAdminSection.svelte`
- Admin shared types: `src/components/admin/types.ts`
- Dashboard/feed feature components: `src/components/feed/familyPreviewCard.svelte`, `src/components/feed/familyNotesCard.svelte`

## Recommended next migration steps

1. Continue splitting remaining large route sections (especially `admin/+page.svelte`) into feature subcomponents.
2. Extract reusable section/toggle components for Admin and dashboard/feed cards.
3. Move more repeated list-item card patterns into dedicated reusable components.

## Definition of done for full unification

- All dialogs use `ModalShell`.
- No repeated inline icon SVG paths.
- No duplicated modal backdrop/shell CSS in route/component files.
- Header wrappers use `PageHeader` where applicable.
- Filter chips use `ChipToggleGroup` where applicable.
- Shared primitives are used consistently across tree/admin/login/profile/dashboard/feed where applicable.
