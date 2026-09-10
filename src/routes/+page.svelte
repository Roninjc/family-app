<script lang="ts">
  import type { FamilyData } from '$lib/types/familyTypes'
  import { onMount, onDestroy, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { page } from '$app/stores'
  import { replaceState } from '$app/navigation'
  import {
    familyTree,
    generations,
    initTreeData,
    renderRoots,
    stack,
    treeVersion,
    visitedMembers
  } from '../stores/tree'
  import { showAddMemberModal } from '../stores/modals'
  import {
    camera,
    drawingLevel,
    hasManualCamera,
    introActive,
    introLineBudgetMs,
    resetCamera,
    revealedGeneration,
    panBy,
    zoomBy
  } from '../stores/treeCamera'
  import {
    centerOnRect,
    fitRectToViewport,
    clampPan,
    type Camera,
    type Rect
  } from '$lib/utils/treeCamera'
  import { attachTreeGestures } from '$lib/utils/pointerGestures'
  import TreeNode from '../components/treeNode.svelte'
  import AddFamilyMemberModal from '../components/addFamilyMemberModal.svelte'
  import EditMemberModal from '../components/editMemberModal.svelte'
  import TreeCameraControls from '../components/treeCameraControls.svelte'

  export let data: {
    familyData?: FamilyData
    linkedMemberId?: string | null
    introStartMemberId?: string | null
  }
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

  let roots: string[] = []
  let treeWrapper: HTMLElement
  let cameraContent: HTMLElement
  let lastQuickAddOpenKey = ''
  let lastIntroOpenKey = ''
  let pendingIntro = false
  let easing = false
  let introMoving = false
  let introTransitionMs = 900
  let introLineMs = 650
  let detachGestures: (() => void) | undefined
  let headerBleed = 0

  function measureHeaderBleed() {
    const header = document.querySelector('.app-route-header')
    headerBleed = header ? header.getBoundingClientRect().height : 0
  }

  function clearQueryFlag(flag: string) {
    if (typeof window === 'undefined') return
    const nextUrl = new URL(window.location.href)
    if (!nextUrl.searchParams.has(flag)) return
    nextUrl.searchParams.delete(flag)
    replaceState(nextUrl, {})
  }

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
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

  // Coming from the personal-level dashboard (?intro=1) arms the cinematic
  // entrance; internal family navigation (admin/hub-fam -> arbol) never sets
  // this flag, so it keeps the instant recenter/last-camera behavior. Flip
  // introActive/reset the reveal counters synchronously (not in onMount) so
  // the very first paint already renders every node hidden - otherwise the
  // full tree would flash at the wrong camera position for a frame first.
  $: {
    const introFlag = $page.url.searchParams.get('intro')
    const locationKey = `${$page.url.pathname}?${$page.url.searchParams.toString()}`

    if (introFlag === '1' && lastIntroOpenKey !== locationKey) {
      lastIntroOpenKey = locationKey
      if (!get(hasManualCamera)) {
        pendingIntro = true
        introActive.set(true)
        revealedGeneration.set(0)
        drawingLevel.set(0)
      }
      clearQueryFlag('intro')
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
        if (destroyed) return
        if (cameFromResize) reclampCamera()
        else if (!get(hasManualCamera)) resetCamera(computeDefaultCamera())
      }, 400)
    }
  }

  let destroyed = false

  onMount(() => {
    measureHeaderBleed()

    setTimeout(() => {
      if (destroyed) return

      if (get(hasManualCamera)) {
        pendingIntro = false
        introActive.set(false)
        return
      }

      if (pendingIntro && !prefersReducedMotion()) {
        pendingIntro = false
        playIntroSequence()
      } else {
        pendingIntro = false
        introActive.set(false)
        resetCamera(computeDefaultCamera())
      }
    }, 400)

    detachGestures = attachTreeGestures(treeWrapper, { panBy, zoomBy }, getRects)
  })

  onDestroy(() => {
    destroyed = true
    detachGestures?.()
  })

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

  // A single member badge's rect, expressed in the same untransformed
  // content coordinates as contentRect, by "undoing" the current transform.
  function memberRect(memberId: string): Rect | null {
    if (!treeWrapper) return null
    const node = document.getElementById(memberId)
    const badgeEl = node?.firstElementChild ?? node
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

  function ownCardRect(): Rect | null {
    return data.linkedMemberId ? memberRect(data.linkedMemberId) : null
  }

  function unionRect(ids: string[]): Rect | null {
    const rects = ids.map(memberRect).filter((rect): rect is Rect => Boolean(rect))
    if (rects.length === 0) return null

    const left = Math.min(...rects.map((rect) => rect.left))
    const top = Math.min(...rects.map((rect) => rect.top))
    const right = Math.max(...rects.map((rect) => rect.left + rect.width))
    const bottom = Math.max(...rects.map((rect) => rect.top + rect.height))

    return { left, top, width: right - left, height: bottom - top }
  }

  // Bounding box around every member up to (and including) the given
  // generation (oldest = 1) - grows as more of the intro reveals.
  function rectUpToGeneration(maxGeneration: number): Rect | null {
    const ids = generations?.filter((g) => g.generation <= maxGeneration).map((g) => g.nodeId) ?? []
    return unionRect(ids)
  }

  // The tree can have several render roots (main family, plus disconnected
  // in-law/side branches rendered next to it - see stores/tree.ts). The
  // intro's opening shot must pick exactly one to avoid framing empty space
  // between two unrelated founding couples: prefer the family's configured
  // choice (admin family settings) if it still exists, otherwise the root
  // with the most descendants (renderRoots is already ordered that way).
  function resolveStartRootId(): string | undefined {
    const configured = data.introStartMemberId
    if (configured) {
      const owningRoot = renderRoots.find((root) =>
        familyTree.getDownwardReach(root).has(configured)
      )
      if (owningRoot) return owningRoot
    }
    return renderRoots[0]
  }

  // Bounding box of just the starting root's own oldest generation (its
  // founding couple), used for the intro's opening close-up shot.
  function startingCoupleRect(): Rect | null {
    const rootId = resolveStartRootId()
    if (!rootId) return null

    const componentIds = familyTree.getDownwardReach(rootId)
    const ids =
      generations
        ?.filter((g) => g.generation === 1 && componentIds.has(g.nodeId))
        .map((g) => g.nodeId) ?? []

    return unionRect(ids)
  }

  function generationCount(): number {
    return generations && generations.length > 0
      ? Math.max(...generations.map((g) => g.generation))
      : 1
  }

  function computeDefaultCamera() {
    const { contentRect, viewportRect } = getRects()
    const targetRect = ownCardRect()

    // Own card, centered exactly in the viewport at a comfortable reading
    // scale - no header-bleed offset here, `viewportRect` already spans the
    // full bled height so centering already accounts for it. Otherwise a
    // neutral fit-to-viewport of the whole tree (e.g. viewers with no linked
    // member), which DOES need the offset so its top edge starts below the
    // header instead of centering into the bled area.
    if (targetRect) return centerOnRect(targetRect, viewportRect, 1)

    const fit = fitRectToViewport(contentRect, viewportRect)
    return { ...fit, y: fit.y + headerBleed }
  }

  function reclampCamera() {
    const { contentRect, viewportRect } = getRects()
    camera.update((current) => clampPan(current, contentRect, viewportRect))
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms))
  }

  // Per-generation pacing: fewer generations get a slower, richer step;
  // trees with many generations get a snappier one, so the whole entrance
  // stays within a reasonable, roughly constant overall budget. The first
  // camera move (revealing generation 2, right after the founding shot) is
  // deliberately slower than the rest - it's the shot that sets the
  // cinematic tone, so it gets extra weight instead of blending in with the
  // steady rhythm of the following levels. Most of each step's time goes to
  // the move itself (camera + line growth) rather than the static hold, so
  // the camera reads as continuously drifting instead of snapping into
  // place and idling before the next move.
  const INTRO_LOOP_BUDGET_MS = 4200
  const INTRO_MIN_STEP_MS = 600
  const INTRO_MAX_STEP_MS = 1500
  const INTRO_FIRST_STEP_BOOST = 1.6
  const INTRO_MOVE_SHARE = 0.8

  function computeStepTiming(genCount: number) {
    const steps = Math.max(1, genCount - 1)
    const stepMs = Math.min(
      INTRO_MAX_STEP_MS,
      Math.max(INTRO_MIN_STEP_MS, INTRO_LOOP_BUDGET_MS / steps)
    )
    return {
      lineDrawMs: Math.round(stepMs * INTRO_MOVE_SHARE),
      holdMs: Math.round(stepMs * (1 - INTRO_MOVE_SHARE))
    }
  }

  function endIntroSequence() {
    introMoving = false
    introActive.set(false)
  }

  function shouldBailIntro(): boolean {
    if (destroyed) return true
    if (get(hasManualCamera)) {
      endIntroSequence()
      return true
    }
    return false
  }

  async function playIntroSequence() {
    try {
      await runIntroSequence()
    } catch (error) {
      console.error('Tree intro sequence failed, revealing the whole tree instead', error)
      if (!destroyed) {
        revealedGeneration.set(Number.MAX_SAFE_INTEGER)
        drawingLevel.set(Number.MAX_SAFE_INTEGER)
        endIntroSequence()
        resetCamera(computeDefaultCamera())
      }
    }
  }

  async function runIntroSequence() {
    revealedGeneration.set(0)
    drawingLevel.set(0)

    const genCount = generationCount()
    const { lineDrawMs, holdMs } = computeStepTiming(genCount)
    introLineMs = lineDrawMs
    introLineBudgetMs.set(lineDrawMs)

    const finalTarget = computeDefaultCamera()
    const withBleed = (cam: Camera) => ({ ...cam, y: cam.y + headerBleed })

    const { viewportRect: initialViewport } = getRects()
    const startRect = startingCoupleRect()
    camera.set(
      startRect ? withBleed(fitRectToViewport(startRect, initialViewport, 60)) : finalTarget
    )
    introMoving = false
    await tick()
    if (shouldBailIntro()) return

    revealedGeneration.set(1)
    await wait(750)
    if (shouldBailIntro()) return

    for (let level = 1; level < genCount; level++) {
      drawingLevel.set(level)

      // The very first step (revealing generation 2) is the cinematic
      // establishing shot - give it extra time so the zoom-out actually
      // reads as deliberate instead of a quick snap.
      const stepBoost = level === 1 ? INTRO_FIRST_STEP_BOOST : 1
      const stepLineDrawMs = Math.round(lineDrawMs * stepBoost)
      const stepHoldMs = Math.round(holdMs * stepBoost)

      const { contentRect, viewportRect } = getRects()
      const rect = rectUpToGeneration(level + 1) ?? contentRect
      introTransitionMs = stepLineDrawMs
      introLineMs = stepLineDrawMs
      introLineBudgetMs.set(stepLineDrawMs)
      introMoving = true
      await tick()
      if (shouldBailIntro()) return

      camera.set(withBleed(fitRectToViewport(rect, viewportRect)))
      await wait(stepLineDrawMs)
      if (shouldBailIntro()) return

      revealedGeneration.set(level + 1)
      await wait(stepHoldMs)
      if (shouldBailIntro()) return
    }

    // Catch any lines whose source is the deepest generation itself (e.g. a
    // childless couple at the last level), which the loop above never gives
    // a drawing turn to.
    drawingLevel.set(genCount)
    await wait(Math.min(holdMs, 250))
    if (shouldBailIntro()) return

    introTransitionMs = 1100
    introMoving = true
    await tick()
    if (shouldBailIntro()) return

    camera.set(finalTarget)
    await wait(1150)
    if (shouldBailIntro()) return

    endIntroSequence()
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
      if (destroyed) return
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
    class:is-intro-move={introMoving}
    bind:this={cameraContent}
    style="--intro-move-ms: {introTransitionMs}ms; --intro-line-ms: {introLineMs}ms; transform: translate({$camera.x}px, {$camera.y}px) scale({$camera.scale})"
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

    // Cinematic entrance zoom-out/zoom-in steps: duration set per-step from
    // JS (paced by how many generations the tree has). Uses a gentle
    // overshoot-and-settle curve instead of the app-wide --motion-standard
    // ease-out, so the camera reads like a handheld cinema camera easing
    // into its mark rather than a mechanical, purely decelerating move.
    &.is-intro-move {
      transition: transform var(--intro-move-ms, 900ms) cubic-bezier(0.34, 1.25, 0.64, 1);
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
