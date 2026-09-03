<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { Application, Sprite, Texture } from 'pixi.js'
  import { CrowdPhysicsEngine } from '$lib/crowd/physicsEngine'
  import type {
    CrowdInitConfig,
    CrowdWorkerInMessage,
    CrowdWorkerOutMessage
  } from '$lib/crowd/types'

  export let membersCount = 0
  export let unlinkedMembersCount = 0
  export let seedKey = ''
  export let debug = false
  export let renderer: 'canvas2d' | 'pixi' = 'canvas2d'
  export let showCenterCount = false

  let wrapperEl: HTMLDivElement | null = null
  let canvasEl: HTMLCanvasElement | null = null
  let pixiHostEl: HTMLDivElement | null = null
  let worker: Worker | null = null
  let observer: ResizeObserver | null = null
  let visibilityObserver: IntersectionObserver | null = null
  let renderFrame: number | null = null
  let fallbackFrame: number | null = null

  let fallbackEngine: CrowdPhysicsEngine | null = null
  let fallbackLastTs = 0
  let fallbackVisible = true
  let pageVisible = true
  let interpolationEnabled = true

  let positions: Float32Array = new Float32Array()
  let displayPositions: Float32Array = new Float32Array()
  let interpolationFrom: Float32Array = new Float32Array()
  let interpolationTo: Float32Array = new Float32Array()
  let interpolationFromTs = 0
  let interpolationToTs = 0
  let interpolationReady = false
  let interpolationSegmentMs = 0
  let depthOrder: Uint16Array = new Uint16Array()
  let linked: Uint8Array = new Uint8Array()
  let tiers: Uint8Array = new Uint8Array()
  let spriteSize = 8
  let hasFrame = false
  let drawWidth = 0
  let drawHeight = 0
  let canvasRadius = 110
  let dpr = 1
  let renderQuality: 'high' | 'balanced' | 'eco' = 'high'
  let drawCostEmaMs = 0
  let drawTotalCostEmaMs = 0
  let qualitySampleCount = 0
  let lastQualitySampleTs = 0
  let downsamplePhase = 0
  let workerPublishIntervalMs = 0
  let workerStepCostEmaMs = 0
  let qualityPressure = 0
  let qualityRelief = 0
  let qualityCeilingRank = 2
  let activeRenderer: 'canvas2d' | 'pixi' = 'canvas2d'
  let pixiApp: Application | null = null
  let pixiSprites: Sprite[] = []
  let pixiTextures = new Map<AtlasKey, Texture>()

  const MIN_INTERPOLATION_SPAN_MS = 18
  const MAX_INTERPOLATION_SPAN_MS = 96
  const COARSE_POINTER_INTERPOLATION_RATIO = 0.84
  const FINE_POINTER_INTERPOLATION_RATIO = 0.92
  const QUALITY_SAMPLE_INTERVAL_MS = 90
  const MAX_RENDERED_CROWD_SPRITES = 120
  let coarsePointerProfile = false

  const qualityRank: Record<'high' | 'balanced' | 'eco', number> = {
    high: 2,
    balanced: 1,
    eco: 0
  }

  const qualityByRank: Array<'eco' | 'balanced' | 'high'> = ['eco', 'balanced', 'high']

  type GaitFrame = 0 | 1 | 2

  const resolveGaitFrame = (avatarIndex: number, frameTs: number): GaitFrame => {
    if (renderQuality === 'eco') return 0

    const phase = frameTs * 0.0108 + avatarIndex * 0.79
    const swing = Math.sin(phase)
    if (swing > 0.32) return 1
    if (swing < -0.32) return 2
    return 0
  }

  const resolveQualityCeilingRank = (count: number, coarsePointer: boolean) => {
    if (coarsePointer) {
      if (count >= 320) return 0
      if (count >= 220) return 1
      return 2
    }

    if (count >= 280) return 1
    return 2
  }

  const updateQualityFromTelemetry = (
    renderCostMs: number,
    totalCostMs = renderCostMs,
    nowTs = performance.now()
  ) => {
    if (lastQualitySampleTs !== 0 && nowTs - lastQualitySampleTs < QUALITY_SAMPLE_INTERVAL_MS) {
      return
    }

    lastQualitySampleTs = nowTs
    qualitySampleCount += 1
    drawCostEmaMs = drawCostEmaMs === 0 ? renderCostMs : drawCostEmaMs * 0.88 + renderCostMs * 0.12
    drawTotalCostEmaMs =
      drawTotalCostEmaMs === 0 ? totalCostMs : drawTotalCostEmaMs * 0.88 + totalCostMs * 0.12

    // Keep quality changes stable by waiting for a small warm-up sample.
    if (qualitySampleCount <= 12) return

    const pressureNow = drawCostEmaMs > 7.8 || workerStepCostEmaMs > 4.8
    const reliefNow = drawCostEmaMs < 4.4 && workerStepCostEmaMs < 3.2

    if (pressureNow) {
      qualityPressure += 1
      qualityRelief = 0
    } else if (reliefNow) {
      qualityRelief += 1
      qualityPressure = 0
    } else {
      qualityPressure = Math.max(0, qualityPressure - 1)
      qualityRelief = Math.max(0, qualityRelief - 1)
    }

    if (qualityPressure >= 8) {
      const nextRank = Math.max(0, qualityRank[renderQuality] - 1)
      renderQuality = qualityByRank[nextRank]
      qualityPressure = 0
      qualityRelief = 0
    }

    if (qualityRelief >= 22) {
      const nextRank = Math.min(qualityCeilingRank, qualityRank[renderQuality] + 1)
      renderQuality = qualityByRank[nextRank]
      qualityRelief = 0
      qualityPressure = 0
    }
  }

  type AtlasKey = `2-${0 | 1}-${GaitFrame}`
  const spriteAtlas = new Map<AtlasKey, HTMLCanvasElement>()
  // TODO: Evaluate pre-generated sprite sheets versus runtime atlas generation for startup cost/art quality tradeoffs.

  const supportsWorker = () => typeof Worker !== 'undefined'

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const r = Math.max(0, Math.min(radius, width * 0.5, height * 0.5))

    // Safari/iOS compatibility: avoid relying on CanvasRenderingContext2D.roundRect.
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const buildAtlasSprite = (linked: 0 | 1, gaitFrame: GaitFrame) => {
    const size = 64
    const atlas = document.createElement('canvas')
    atlas.width = size
    atlas.height = size
    const ctx = atlas.getContext('2d')
    if (!ctx) return atlas

    const fillBase = linked ? '#7f9fc7' : '#7595bf'
    const fillHigh = linked ? '#a9c2e1' : '#9fb9dc'
    const fillLow = linked ? '#5f7fa9' : '#5777a2'
    const contour = linked ? 'rgba(56,84,121,0.24)' : 'rgba(50,78,116,0.22)'
    const shadow = linked ? 'rgba(23,35,56,0.16)' : 'rgba(23,35,56,0.13)'

    ctx.clearRect(0, 0, size, size)
    ctx.translate(size / 2, size / 2)

    const walkerYOffset = -2.4

    const armLeftEnd =
      gaitFrame === 1
        ? { x: -9.0, y: 9.4 }
        : gaitFrame === 2
          ? { x: -11.2, y: 5.3 }
          : { x: -10.2, y: 7.6 }
    const armRightEnd =
      gaitFrame === 1
        ? { x: 11.2, y: 4.9 }
        : gaitFrame === 2
          ? { x: 9.0, y: 9.2 }
          : { x: 10.2, y: 7.2 }
    const legLeftEnd =
      gaitFrame === 1
        ? { x: -7.4, y: 25.9 }
        : gaitFrame === 2
          ? { x: -3.6, y: 30.4 }
          : { x: -4.8, y: 28.8 }
    const legRightEnd =
      gaitFrame === 1
        ? { x: 6.9, y: 31.2 }
        : gaitFrame === 2
          ? { x: 2.9, y: 26.9 }
          : { x: 6.2, y: 29.6 }

    ctx.fillStyle = shadow
    ctx.beginPath()
    ctx.ellipse(3.5, 31.2 + walkerYOffset, 13.3, 3.3, 0.24, 0, Math.PI * 2)
    ctx.fill()

    // Minimal walker silhouette: flat head/body, simple limbs and one leading leg.
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const limbGradient = ctx.createLinearGradient(0, -16, 0, 30)
    limbGradient.addColorStop(0, fillHigh)
    limbGradient.addColorStop(0.58, fillBase)
    limbGradient.addColorStop(1, fillLow)
    ctx.strokeStyle = limbGradient
    ctx.lineWidth = 4.2
    ctx.beginPath()
    ctx.moveTo(-4.6, -5 + walkerYOffset)
    ctx.lineTo(armLeftEnd.x, armLeftEnd.y + walkerYOffset)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(4.6, -5 + walkerYOffset)
    ctx.lineTo(armRightEnd.x, armRightEnd.y + walkerYOffset)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(-2.2, 15 + walkerYOffset)
    ctx.lineTo(legLeftEnd.x, legLeftEnd.y + walkerYOffset)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(2.2, 15 + walkerYOffset)
    ctx.lineTo(legRightEnd.x, legRightEnd.y + walkerYOffset)
    ctx.stroke()

    const bodyGradient = ctx.createLinearGradient(0, -12, 0, 28)
    bodyGradient.addColorStop(0, fillHigh)
    bodyGradient.addColorStop(0.62, fillBase)
    bodyGradient.addColorStop(1, fillLow)
    ctx.fillStyle = bodyGradient
    drawRoundedRect(ctx, -6.2, -8.6 + walkerYOffset, 12.4, 30.6, 6.2)
    ctx.fill()

    ctx.strokeStyle = contour
    ctx.lineWidth = 0.9
    drawRoundedRect(ctx, -6.2, -8.6 + walkerYOffset, 12.4, 30.6, 6.2)
    ctx.stroke()

    const headGradient = ctx.createLinearGradient(0, -31, 0, -11)
    headGradient.addColorStop(0, fillHigh)
    headGradient.addColorStop(0.66, fillBase)
    headGradient.addColorStop(1, fillLow)
    ctx.fillStyle = headGradient
    ctx.beginPath()
    ctx.arc(0, -19.4 + walkerYOffset, 9.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = contour
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.arc(0, -19.4 + walkerYOffset, 9.2, 0, Math.PI * 2)
    ctx.stroke()

    return atlas
  }

  const buildEmergencyAtlasSprite = (linked: 0 | 1, gaitFrame: GaitFrame) => {
    const legLeftEnd =
      gaitFrame === 1
        ? { x: -6.5, y: 26.1 }
        : gaitFrame === 2
          ? { x: -3.1, y: 30.1 }
          : { x: -4.2, y: 31 }
    const legRightEnd =
      gaitFrame === 1
        ? { x: 6.3, y: 31.3 }
        : gaitFrame === 2
          ? { x: 2.5, y: 27.2 }
          : { x: 5.6, y: 32 }

    const size = 64
    const atlas = document.createElement('canvas')
    atlas.width = size
    atlas.height = size
    const ctx = atlas.getContext('2d')
    if (!ctx) return atlas

    const fill = linked ? '#87a8d4' : '#7d9fcd'
    const shade = linked ? '#6d8fbe' : '#6487b8'

    ctx.clearRect(0, 0, size, size)
    ctx.translate(size / 2, size / 2)
    ctx.fillStyle = 'rgba(20, 32, 54, 0.16)'
    ctx.beginPath()
    ctx.ellipse(4.1, 26.2, 14.1, 3.1, 0.24, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = fill
    drawRoundedRect(ctx, -6.5, -5, 13, 29, 6.5)
    ctx.fill()
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.arc(0, -15.5, 9, 0, Math.PI * 2)
    ctx.fill()

    ctx.lineCap = 'round'
    ctx.strokeStyle = fill
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-4, -1)
    ctx.lineTo(-9.2, 10)
    ctx.moveTo(4, -1)
    ctx.lineTo(9.2, 10)
    ctx.moveTo(-2, 18)
    ctx.lineTo(legLeftEnd.x, legLeftEnd.y)
    ctx.moveTo(2, 18)
    ctx.lineTo(legRightEnd.x, legRightEnd.y)
    ctx.stroke()

    return atlas
  }

  const ensureAtlas = () => {
    if (spriteAtlas.size > 0) return

    for (const linked of [0, 1] as const) {
      for (const gaitFrame of [0, 1, 2] as const) {
        try {
          spriteAtlas.set(`2-${linked}-${gaitFrame}`, buildAtlasSprite(linked, gaitFrame))
        } catch {
          spriteAtlas.set(`2-${linked}-${gaitFrame}`, buildEmergencyAtlasSprite(linked, gaitFrame))
        }
      }
    }
  }

  const clearRenderer = () => {
    if (renderFrame !== null) {
      cancelAnimationFrame(renderFrame)
      renderFrame = null
    }

    if (fallbackFrame !== null) {
      cancelAnimationFrame(fallbackFrame)
      fallbackFrame = null
    }
  }

  const resolveInterpolationSpanMs = () => {
    const baseInterval = workerPublishIntervalMs || 33.34
    const pointerRatio = coarsePointerProfile
      ? COARSE_POINTER_INTERPOLATION_RATIO
      : FINE_POINTER_INTERPOLATION_RATIO
    const qualityRatio = renderQuality === 'eco' ? 1.08 : renderQuality === 'balanced' ? 1 : 0.94
    const loadRatio = workerStepCostEmaMs > 6.5 ? 1.06 : workerStepCostEmaMs < 3.5 ? 0.95 : 1
    const tuned = baseInterval * pointerRatio * qualityRatio * loadRatio

    return Math.min(MAX_INTERPOLATION_SPAN_MS, Math.max(MIN_INTERPOLATION_SPAN_MS, tuned))
  }

  const toggleInterpolation = () => {
    interpolationEnabled = !interpolationEnabled
    if (!interpolationEnabled) {
      interpolationReady = false
      displayPositions = positions
      requestDraw()
      return
    }

    if (positions.length > 0) {
      ingestSnapshotPositions(positions.slice())
    }
    requestDraw()
  }

  const onDebugKeyDown = (event: KeyboardEvent) => {
    if (!debug) return
    if (event.key.toLowerCase() !== 'i') return
    event.preventDefault()
    toggleInterpolation()
  }

  const primeInterpolationFromCurrent = (positionsLength: number) => {
    if (displayPositions.length === positionsLength && displayPositions.length > 0) {
      interpolationFrom = displayPositions.slice()
      return
    }

    interpolationFrom = positions.slice()
  }

  const ingestSnapshotPositions = (nextPositions: Float32Array) => {
    const now = performance.now()
    const positionsLength = nextPositions.length

    const shouldResetInterpolation =
      !interpolationEnabled ||
      !interpolationReady ||
      positionsLength === 0 ||
      positions.length !== positionsLength ||
      displayPositions.length !== positionsLength

    positions = nextPositions

    if (shouldResetInterpolation) {
      displayPositions = nextPositions.slice()
      interpolationFrom = nextPositions.slice()
      interpolationTo = nextPositions.slice()
      interpolationFromTs = now
      interpolationToTs = now
      interpolationReady = true
      return
    }

    primeInterpolationFromCurrent(positionsLength)
    interpolationTo = nextPositions.slice()
    interpolationSegmentMs = resolveInterpolationSpanMs()
    interpolationFromTs = now
    interpolationToTs = now + interpolationSegmentMs
    interpolationReady = true
  }

  const shouldKeepRenderLoop = (frameTs: number) =>
    Boolean(worker) &&
    hasFrame &&
    positions.length > 0 &&
    fallbackVisible &&
    pageVisible &&
    interpolationEnabled &&
    interpolationReady &&
    interpolationToTs > interpolationFromTs &&
    frameTs < interpolationToTs

  const updateDisplayPositions = (frameTs: number) => {
    if (!worker || !interpolationEnabled || !interpolationReady || positions.length === 0) {
      displayPositions = positions
      return
    }

    const frameTime = frameTs || performance.now()
    const span = interpolationToTs - interpolationFromTs

    if (span <= 0) {
      displayPositions = interpolationTo
      return
    }

    const alpha = Math.min(1, Math.max(0, (frameTime - interpolationFromTs) / span))

    if (displayPositions.length !== interpolationTo.length) {
      displayPositions = new Float32Array(interpolationTo.length)
    }

    for (let i = 0; i < interpolationTo.length; i += 1) {
      const from = interpolationFrom[i]
      const to = interpolationTo[i]
      displayPositions[i] = from + (to - from) * alpha
    }
  }

  const teardown = () => {
    clearRenderer()
    worker?.postMessage({ type: 'dispose' } satisfies CrowdWorkerInMessage)
    worker?.terminate()
    worker = null
    fallbackEngine = null
    observer?.disconnect()
    observer = null
    visibilityObserver?.disconnect()
    visibilityObserver = null
    if (pixiApp) {
      try {
        pixiApp.destroy(true, { children: true, texture: false, baseTexture: false })
      } catch {
        // no-op
      }
      pixiApp = null
    }
    pixiSprites = []
    pixiTextures = new Map<AtlasKey, Texture>()
  }

  const ensurePixiTextures = async () => {
    if (pixiTextures.size > 0) return

    const PIXI = await import('pixi.js')
    for (const [key, atlas] of spriteAtlas.entries()) {
      pixiTextures.set(key, PIXI.Texture.from(atlas))
    }
  }

  const initPixiRenderer = async () => {
    if (!pixiHostEl || activeRenderer !== 'pixi') return false

    try {
      const PIXI = await import('pixi.js')
      await ensurePixiTextures()

      pixiApp = new PIXI.Application({
        width: Math.max(1, Math.round(drawWidth)),
        height: Math.max(1, Math.round(drawHeight)),
        resolution: dpr,
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
        sharedTicker: false
      })
      pixiApp.stop()
      pixiApp.stage.sortableChildren = true
      pixiHostEl.innerHTML = ''
      pixiHostEl.appendChild(pixiApp.view as HTMLCanvasElement)
      return true
    } catch {
      pixiApp = null
      return false
    }
  }

  const ensurePixiSpritesSafe = async (count: number) => {
    if (!pixiApp) return
    if (pixiSprites.length === count) return

    const PIXI = await import('pixi.js')
    pixiApp.stage.removeChildren()
    pixiSprites = []
    for (let i = 0; i < count; i += 1) {
      const sprite = new PIXI.Sprite()
      sprite.anchor.set(0.5, 0.5)
      pixiSprites.push(sprite)
      pixiApp.stage.addChild(sprite)
    }
  }

  const renderPixi = (totalStartTs = performance.now(), frameTs = performance.now()) => {
    const renderStart = performance.now()
    if (!pixiApp || !hasFrame || displayPositions.length === 0 || depthOrder.length === 0) return

    void ensurePixiSpritesSafe(linked.length)
    if (pixiSprites.length !== linked.length) return

    const cx = drawWidth * 0.5
    const cy = drawHeight * 0.5
    const scale = spriteSize / 32
    downsamplePhase = (downsamplePhase + 1) % 2

    for (let i = 0; i < pixiSprites.length; i += 1) {
      const sprite = pixiSprites[i]
      const tier = tiers[i] as 0 | 1 | 2

      if (renderQuality !== 'high' && tier === 0) {
        if (renderQuality === 'eco' && i % 2 !== downsamplePhase) {
          sprite.visible = false
          continue
        }
        if (renderQuality === 'balanced' && i % 3 === 2) {
          sprite.visible = false
          continue
        }
      }

      const linkedValue = linked[i] as 0 | 1
      const gaitFrame = resolveGaitFrame(i, frameTs)
      const texture = pixiTextures.get(`2-${linkedValue}-${gaitFrame}`)
      if (texture) sprite.texture = texture

      sprite.visible = true
      sprite.scale.set(scale)
      sprite.position.set(cx + displayPositions[i * 2], cy + displayPositions[i * 2 + 1])
    }

    for (let orderIndex = 0; orderIndex < depthOrder.length; orderIndex += 1) {
      const avatarIndex = depthOrder[orderIndex]
      const sprite = pixiSprites[avatarIndex]
      if (!sprite) continue
      sprite.zIndex = orderIndex
    }

    pixiApp.render()
    const endTs = performance.now()
    updateQualityFromTelemetry(endTs - renderStart, endTs - totalStartTs, endTs)
  }

  const setupCanvasSize = () => {
    if (!wrapperEl) return

    const rect = wrapperEl.getBoundingClientRect()
    drawWidth = Math.max(1, rect.width)
    drawHeight = Math.max(1, rect.height)
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

    if (canvasEl) {
      canvasEl.width = Math.round(drawWidth * dpr)
      canvasEl.height = Math.round(drawHeight * dpr)
      canvasEl.style.width = `${drawWidth}px`
      canvasEl.style.height = `${drawHeight}px`
    }

    if (pixiApp) {
      pixiApp.renderer.resolution = dpr
      pixiApp.renderer.resize(
        Math.max(1, Math.round(drawWidth)),
        Math.max(1, Math.round(drawHeight))
      )
      renderPixi()
    }

    canvasRadius = Math.max(24, Math.min(drawWidth, drawHeight) * 0.5 - 6)

    worker?.postMessage({ type: 'resize', radius: canvasRadius } satisfies CrowdWorkerInMessage)
    fallbackEngine?.setRadius(canvasRadius)
    if (activeRenderer === 'pixi') {
      renderPixi()
    } else {
      requestDraw()
    }
  }

  const requestDraw = () => {
    if (renderFrame !== null) return

    renderFrame = requestAnimationFrame((frameTs) => {
      renderFrame = null
      draw(frameTs)

      if (shouldKeepRenderLoop(frameTs)) {
        requestDraw()
      }
    })
  }

  const draw = (frameTs = performance.now()) => {
    const totalStartTs = performance.now()
    updateDisplayPositions(frameTs)

    if (activeRenderer === 'pixi') {
      renderPixi(totalStartTs, frameTs)
      return
    }

    if (!canvasEl) return
    const drawStart = performance.now()
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (!hasFrame || depthOrder.length === 0 || displayPositions.length === 0) {
      return
    }

    const cx = drawWidth * 0.5
    const cy = drawHeight * 0.5
    const scale = spriteSize / 32
    downsamplePhase = (downsamplePhase + 1) % 2

    for (let orderIndex = 0; orderIndex < depthOrder.length; orderIndex += 1) {
      const i = depthOrder[orderIndex]
      const x = displayPositions[i * 2]
      const y = displayPositions[i * 2 + 1]
      const linkedValue = linked[i] as 0 | 1
      const tier = tiers[i] as 0 | 1 | 2

      if (renderQuality !== 'high') {
        // Under load, preserve foreground/full detail first and thin out background minimal sprites.
        if (tier === 0) {
          if (renderQuality === 'eco' && i % 2 !== downsamplePhase) continue
          if (renderQuality === 'balanced' && i % 3 === 2) continue
        }
      }

      const gaitFrame = resolveGaitFrame(i, frameTs)
      const sprite = spriteAtlas.get(`2-${linkedValue}-${gaitFrame}`)
      if (!sprite) continue

      const drawX = cx + x - sprite.width * 0.5 * scale
      const drawY = cy + y - sprite.height * 0.5 * scale
      ctx.drawImage(sprite, drawX, drawY, sprite.width * scale, sprite.height * scale)
    }

    const nowTs = performance.now()
    const drawCostMs = nowTs - drawStart
    updateQualityFromTelemetry(drawCostMs, nowTs - totalStartTs, nowTs)
  }

  const startFallbackLoop = (config: CrowdInitConfig) => {
    fallbackEngine = new CrowdPhysicsEngine(config)
    fallbackLastTs = performance.now()
    qualitySampleCount = 0
    lastQualitySampleTs = 0
    drawCostEmaMs = 0
    drawTotalCostEmaMs = 0
    renderQuality = qualityByRank[qualityCeilingRank]
    qualityPressure = 0
    qualityRelief = 0

    const fallbackTick = (time: number) => {
      if (!fallbackEngine) return

      const dtMs = Math.min(time - fallbackLastTs, 100)
      fallbackLastTs = time

      if (fallbackVisible) {
        fallbackEngine.step(dtMs, time)
      }
      const fallbackSnapshot = fallbackEngine.snapshot()
      positions = fallbackSnapshot.positions
      displayPositions = fallbackSnapshot.positions
      interpolationReady = false
      depthOrder = fallbackSnapshot.depthOrder
      linked = fallbackSnapshot.linked
      tiers = fallbackSnapshot.tiers
      spriteSize = fallbackSnapshot.spriteSize
      hasFrame = true
      draw()
      fallbackFrame = requestAnimationFrame(fallbackTick)
    }

    fallbackFrame = requestAnimationFrame(fallbackTick)
  }

  const initWorker = (config: CrowdInitConfig) => {
    try {
      worker = new Worker(new URL('../../lib/crowd/crowd.worker.ts', import.meta.url), {
        type: 'module'
      })
    } catch {
      worker = null
      startFallbackLoop(config)
      return
    }

    worker.onmessage = (event: MessageEvent<CrowdWorkerOutMessage>) => {
      const message = event.data
      if (message.type === 'snapshot-full') {
        linked = message.staticState.linked
        tiers = message.staticState.tiers
        spriteSize = message.staticState.spriteSize
        ingestSnapshotPositions(message.frame.positions)
        depthOrder = message.frame.depthOrder
        hasFrame = true
        if (activeRenderer === 'pixi') {
          requestDraw()
        } else {
          requestDraw()
        }
        return
      }

      if (message.type === 'snapshot-delta') {
        if (positions.length === 0) {
          return
        }

        const {
          changedIndices,
          positions: changedPositions,
          depthOrder: nextDepthOrder
        } = message.frame

        for (let i = 0; i < changedIndices.length; i += 1) {
          const avatarIndex = changedIndices[i]
          const targetOffset = avatarIndex * 2
          const sourceOffset = i * 2
          positions[targetOffset] = changedPositions[sourceOffset]
          positions[targetOffset + 1] = changedPositions[sourceOffset + 1]
        }

        ingestSnapshotPositions(positions.slice())

        depthOrder = nextDepthOrder
        hasFrame = true
        if (activeRenderer === 'pixi') {
          requestDraw()
        } else {
          requestDraw()
        }
        return
      }

      if (message.type === 'telemetry') {
        workerPublishIntervalMs = message.publishIntervalMs
        workerStepCostEmaMs = message.stepCostEmaMs
      }
    }

    worker.onerror = () => {
      worker?.terminate()
      worker = null
      startFallbackLoop(config)
    }

    worker.postMessage({ type: 'init', config } satisfies CrowdWorkerInMessage)
  }

  const initialize = () => {
    if (!wrapperEl) return

    activeRenderer = renderer

    setupCanvasSize()
    ensureAtlas()

    if (activeRenderer === 'pixi') {
      void initPixiRenderer().then((ok) => {
        if (!ok) {
          activeRenderer = 'canvas2d'
        }
      })
    }

    const config: CrowdInitConfig = {
      seedKey,
      count: Math.min(MAX_RENDERED_CROWD_SPRITES, Math.max(0, membersCount)),
      unlinkedCount: Math.min(
        Math.min(MAX_RENDERED_CROWD_SPRITES, Math.max(0, membersCount)),
        Math.max(0, unlinkedMembersCount)
      ),
      radius: canvasRadius,
      coarsePointer:
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(pointer: coarse)').matches
          : false
    }
    coarsePointerProfile = config.coarsePointer

    qualityCeilingRank = resolveQualityCeilingRank(config.count, config.coarsePointer)

    if (supportsWorker()) {
      initWorker(config)
      if (activeRenderer === 'pixi') {
        renderPixi()
      } else {
        requestDraw()
      }
    } else {
      startFallbackLoop(config)
    }

    qualitySampleCount = 0
    lastQualitySampleTs = 0
    drawCostEmaMs = 0
    drawTotalCostEmaMs = 0
    renderQuality = qualityByRank[qualityCeilingRank]
    qualityPressure = 0
    qualityRelief = 0

    observer = new ResizeObserver(() => {
      setupCanvasSize()
    })
    observer.observe(wrapperEl)

    visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        fallbackVisible = entry.isIntersecting
        worker?.postMessage({
          type: 'visibility',
          visible: entry.isIntersecting
        } satisfies CrowdWorkerInMessage)
        if (entry.isIntersecting) {
          requestDraw()
        }
      },
      {
        rootMargin: '220px 0px',
        threshold: 0.01
      }
    )
    visibilityObserver.observe(wrapperEl)

    pageVisible = typeof document === 'undefined' ? true : document.visibilityState === 'visible'
    window.addEventListener('keydown', onDebugKeyDown)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  const onVisibilityChange = () => {
    if (typeof document === 'undefined') return

    const visible = document.visibilityState === 'visible'
    pageVisible = visible
    if (visible) {
      worker?.postMessage({ type: 'resume' } satisfies CrowdWorkerInMessage)
      requestDraw()
      return
    }

    worker?.postMessage({ type: 'pause' } satisfies CrowdWorkerInMessage)
  }

  onMount(() => {
    initialize()
  })

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onDebugKeyDown)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    teardown()
  })
</script>

<div
  class="family-crowd-canvas"
  bind:this={wrapperEl}
  role="img"
  aria-label={`${membersCount} miembros en la familia`}
>
  {#if showCenterCount}
    <div class="crowd-floor-count" aria-hidden="true">
      <span class="crowd-floor-count__value">{membersCount}</span>
    </div>
  {/if}
  <div class="pixi-host" bind:this={pixiHostEl}></div>
  <canvas bind:this={canvasEl} class:canvas-hidden={activeRenderer === 'pixi'}></canvas>
</div>
{#if debug}
  <div class="crowd-debug">
    <span>Q:{renderQuality}</span>
    <span>Dg:{drawCostEmaMs.toFixed(1)}ms</span>
    <span>Dt:{drawTotalCostEmaMs.toFixed(1)}ms</span>
    <span>P:{workerPublishIntervalMs ? workerPublishIntervalMs.toFixed(0) : '-'}ms</span>
    <span>S:{workerStepCostEmaMs ? workerStepCostEmaMs.toFixed(1) : '-'}ms</span>
    <span>I:{interpolationEnabled ? 'on' : 'off'}</span>
    <span>L:{resolveInterpolationSpanMs().toFixed(0)}ms</span>
    <button type="button" class="crowd-debug__toggle" on:click={toggleInterpolation}>
      Interpolación
    </button>
  </div>
{/if}

<style lang="scss">
  .family-crowd-canvas {
    position: relative;
    width: min(66vw, 410px);
    aspect-ratio: 1;
    border-radius: 999px;
    background: radial-gradient(
      circle at 34% 26%,
      rgba(255, 253, 250, 0.98),
      rgba(236, 225, 211, 0.8)
    );
    box-shadow:
      10px 10px 26px rgba(140, 109, 83, 0.18),
      -10px -10px 26px rgba(255, 255, 255, 0.82),
      inset 7px 7px 14px rgba(149, 121, 95, 0.14),
      inset -7px -7px 14px rgba(255, 255, 255, 0.82);
    overflow: clip;
  }

  canvas {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
  }

  .canvas-hidden {
    visibility: hidden;
  }

  .pixi-host {
    position: absolute;
    inset: 0;
    z-index: 2;
  }

  .crowd-floor-count {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .crowd-floor-count__value {
    position: static;
    display: inline-block;
    font-family: inherit;
    font-size: clamp(3.5rem, calc(11vw + 1.8rem), 6rem);
    font-weight: 200;
    letter-spacing: 0.012em;
    line-height: 0.9;
    color: #95bde7;
    text-shadow:
      0 0 0.01em rgba(219, 233, 250, 0.85),
      0 0 0.07em rgba(160, 194, 234, 0.42),
      0 0 0.16em rgba(110, 146, 191, 0.26),
      0 1px 1.6px rgba(42, 63, 93, 0.22);
    filter: saturate(1.1) brightness(1.07);
    user-select: none;
  }

  .pixi-host :global(canvas) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .crowd-debug {
    position: absolute;
    left: 12px;
    bottom: 10px;
    z-index: 3;
    display: flex;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 8px;
    font-size: 0.62rem;
    line-height: 1;
    letter-spacing: 0.01em;
    color: rgba(47, 35, 24, 0.85);
    background: rgba(255, 251, 245, 0.78);
    border: 1px solid rgba(149, 121, 95, 0.16);
    backdrop-filter: blur(2px);
    align-items: center;
    flex-wrap: wrap;
  }

  .crowd-debug__toggle {
    border: 1px solid rgba(149, 121, 95, 0.36);
    background: rgba(255, 248, 239, 0.85);
    color: rgba(47, 35, 24, 0.9);
    border-radius: 999px;
    padding: 0.2rem 0.5rem;
    font-size: 0.6rem;
    line-height: 1;
    cursor: pointer;
  }

  .crowd-debug__toggle:hover {
    background: rgba(255, 245, 232, 0.95);
  }

  @media (min-width: 780px) {
    .family-crowd-canvas {
      width: 430px;
    }
  }
</style>
