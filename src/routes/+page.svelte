<script lang="ts">
  import type { FamilyData } from '$lib/types/familyTypes'
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { page } from '$app/stores'
  import { initTreeData, renderRoots, stack, treeVersion, visitedMembers } from '../stores/tree'
  import { showAddMemberModal } from '../stores/modals'
  import { camera, hasManualCamera, resetCamera, panBy, zoomBy } from '../stores/treeCamera'
  import { centerOnRect, fitRectToViewport, clampPan, type Rect } from '$lib/utils/treeCamera'
  import { attachTreeGestures } from '$lib/utils/pointerGestures'
  import TreeNode from '../components/treeNode.svelte'
  import AddFamilyMemberModal from '../components/addFamilyMemberModal.svelte'
  import EditMemberModal from '../components/editMemberModal.svelte'
  import TreeCameraControls from '../components/treeCameraControls.svelte'

  export let data: { familyData?: FamilyData; linkedMemberId?: string | null }
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

  let roots: string[] = []
  let treeWrapper: HTMLElement
  let cameraContent: HTMLElement
  let lastQuickAddOpenKey = ''
  let easing = false
  let detachGestures: (() => void) | undefined
  let headerBleed = 0

  function measureHeaderBleed() {
    const header = document.querySelector('.app-route-header')
    headerBleed = header ? header.getBoundingClientRect().height : 0
  }

  // Rebuild the graph whenever the page data changes (initial load or after
  // adding a member), then re-seed the render stores before the {#key} block
  // re-mounts the tree.
  $: if (data.familyData) initTreeData(data.familyData)
  $: resetTreeRender($treeVersion)
  $: {
    const quickAdd = $page.url.searchParams.get('quickadd')
    const locationKey = `${$page.url.pathname}?${$page.url.searchParams.toString()}`

    if (quickAdd === 'member' && lastQuickAddOpenKey !== locationKey) {
      lastQuickAddOpenKey = locationKey
      showAddMemberModal.set(true)
    }
  }

  // A window resize only needs a re-measure of connection lines (hence the
  // treeVersion bump below), not a camera reset - track it separately so the
  // default-camera logic only runs on genuine data reloads.
  let pendingResizeReload = false

  function resetTreeRender(version: number) {
    visitedMembers.set([])
    // One root per tree to render: the main family first, then in-law
    // ancestors / disconnected components (see renderRoots).
    roots = renderRoots
    stack.set([...roots])

    const cameFromResize = pendingResizeReload
    pendingResizeReload = false

    if (version > 0) {
      setTimeout(() => {
        if (cameFromResize) reclampCamera()
        else if (!get(hasManualCamera)) resetCamera(computeDefaultCamera())
      }, 400)
    }
  }

  onMount(() => {
    measureHeaderBleed()

    setTimeout(() => {
      if (!get(hasManualCamera)) resetCamera(computeDefaultCamera())
    }, 400)

    detachGestures = attachTreeGestures(treeWrapper, { panBy, zoomBy }, getRects)
  })

  onDestroy(() => detachGestures?.())

  function getRects(): { contentRect: Rect; viewportRect: Rect } {
    return {
      contentRect: {
        left: 0,
        top: 0,
        width: cameraContent?.offsetWidth ?? 0,
        height: cameraContent?.offsetHeight ?? 0
      },
      viewportRect: {
        left: 0,
        top: 0,
        width: treeWrapper?.clientWidth ?? 0,
        height: treeWrapper?.clientHeight ?? 0
      }
    }
  }

  // The logged-in user's own card, expressed in the same untransformed
  // content coordinates as contentRect, by "undoing" the current transform.
  function ownCardRect(): Rect | null {
    if (!data.linkedMemberId || !treeWrapper) return null
    const badgeEl = document.getElementById(data.linkedMemberId)
    if (!badgeEl) return null

    const wrapperRect = treeWrapper.getBoundingClientRect()
    const badgeRect = badgeEl.getBoundingClientRect()
    const cam = get(camera)

    return {
      left: (badgeRect.left - wrapperRect.left - cam.x) / cam.scale,
      top: (badgeRect.top - wrapperRect.top - cam.y) / cam.scale,
      width: badgeRect.width / cam.scale,
      height: badgeRect.height / cam.scale
    }
  }

  function computeDefaultCamera() {
    const { contentRect, viewportRect } = getRects()
    const targetRect = ownCardRect()

    // Own card, at a comfortable reading scale; otherwise a neutral
    // fit-to-viewport of the whole tree (e.g. viewers with no linked member).
    const target = targetRect
      ? centerOnRect(targetRect, viewportRect, 1)
      : fitRectToViewport(contentRect, viewportRect)

    return { ...target, y: target.y + headerBleed }
  }

  function reclampCamera() {
    const { contentRect, viewportRect } = getRects()
    camera.update((current) => clampPan(current, contentRect, viewportRect))
  }

  function easedCameraUpdate(next: ReturnType<typeof computeDefaultCamera>) {
    easing = true
    resetCamera(next)
    setTimeout(() => (easing = false), 220)
  }

  function handleZoomIn() {
    const { contentRect, viewportRect } = getRects()
    easing = true
    zoomBy(
      1.25,
      { x: viewportRect.width / 2, y: viewportRect.height / 2 },
      contentRect,
      viewportRect
    )
    setTimeout(() => (easing = false), 220)
  }

  function handleZoomOut() {
    const { contentRect, viewportRect } = getRects()
    easing = true
    zoomBy(
      0.8,
      { x: viewportRect.width / 2, y: viewportRect.height / 2 },
      contentRect,
      viewportRect
    )
    setTimeout(() => (easing = false), 220)
  }

  function handleResetView() {
    easedCameraUpdate(computeDefaultCamera())
  }

  // Lines are measured once when each node mounts, so on window resize the
  // tree is re-mounted (debounced) to re-measure.
  let resizeTimer: ReturnType<typeof setTimeout>
  function handleResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      measureHeaderBleed()
      pendingResizeReload = true
      treeVersion.update((version) => version + 1)
    }, 250)
  }
</script>

<svelte:window on:resize={handleResize} />

<main
  id="family-tree-wrapper"
  data-route-params-count={routeParamsCount}
  style="--tree-header-bleed: {headerBleed}px"
  bind:this={treeWrapper}
>
  <div
    class="tree-camera"
    class:is-easing={easing}
    bind:this={cameraContent}
    style="transform: translate({$camera.x}px, {$camera.y}px) scale({$camera.scale})"
  >
    {#key $treeVersion}
      {#if roots.length > 0}
        {#each roots as rootMemberId (rootMemberId)}
          <TreeNode memberId={rootMemberId} />
        {/each}
      {:else}
        <div class="empty-tree-message" role="status">
          <p class="empty-title">Tu árbol familiar está listo para empezar.</p>
          <p class="empty-subtitle">
            Añade el primer miembro para construir conexiones, ramas y generaciones.
          </p>
        </div>
      {/if}
    {/key}
  </div>
</main>
<TreeCameraControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetView} />
<AddFamilyMemberModal />
<EditMemberModal />

<style lang="scss">
  #family-tree-wrapper {
    --tree-row-height: 126px;
    --tree-generation-gap: 74px;
    --tree-generation-step: calc(var(--tree-row-height) + var(--tree-generation-gap));
    --tree-band-height: calc(var(--tree-row-height) + 10px);
    position: relative;
    background: transparent;
    height: 100%;
    min-height: 100vh;
    margin-top: calc(-1 * var(--tree-header-bleed));
    padding-top: var(--tree-header-bleed);
    overflow: hidden;
    touch-action: none;
    background-image: none;

    @media (max-width: 720px) {
      --tree-row-height: 120px;
      --tree-band-height: calc(var(--tree-row-height) + 8px);
    }
  }

  .tree-camera {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: row;
    // Without this, an absolutely positioned flex box shrinks to fit the
    // (possibly narrower) containing block instead of its true content size,
    // which throws off offsetWidth-based fit/reset camera math.
    width: max-content;
    // Gap between root trees (main family, in-law branches...)
    gap: 120px;
    padding: 30px 18px 24px;
    padding-bottom: max(154px, env(safe-area-inset-bottom));
    transform-origin: 0 0;
    transition: none;

    &.is-easing {
      transition: transform var(--dur-ui) var(--motion-standard);
    }

    @media (max-width: 720px) {
      gap: 80px;
      padding: 24px 14px 16px;
      padding-bottom: max(182px, env(safe-area-inset-bottom));
    }
  }

  .empty-tree-message {
    --empty-tree-shadow: 0 14px 24px rgba(106, 62, 30, 0.12);
    margin: 0 auto;
    max-width: 520px;
    text-align: center;
    padding: 20px 18px;
    border-radius: 14px;
    color: var(--text-muted);
    background: linear-gradient(160deg, rgba(255, 252, 247, 0.72), rgba(255, 241, 224, 0.46));
    box-shadow: var(--empty-tree-shadow);
    transition: box-shadow var(--neumo-shadow-transition-duration)
      var(--neumo-shadow-transition-ease);

    .empty-title,
    .empty-subtitle {
      margin: 0;
    }

    .empty-title {
      font-size: var(--fs-lg);
      line-height: var(--lh-tight);
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .empty-subtitle {
      font-size: var(--fs-sm);
      line-height: var(--lh-copy);
    }
  }
</style>
