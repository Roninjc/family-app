/// <reference lib="webworker" />

import { CrowdPhysicsEngine } from './physicsEngine'
import type { CrowdWorkerInMessage, CrowdWorkerOutMessage } from './types'

declare const self: DedicatedWorkerGlobalScope

const FIXED_STEP_MS = 1000 / 30

let engine: CrowdPhysicsEngine | null = null
let timer: ReturnType<typeof setInterval> | null = null
let visible = true
let paused = false
let lastTick = 0
let accumulator = 0
let nowTime = 0
let lastPublishTs = 0
let lastTelemetryTs = 0
let publishIntervalMs = 33.34
let stepCostEmaMs = 0
let profileCoarsePointer = false
let profileCount = 0
let loadPressure = 0
let publishSequence = 0
let lastPublishedPositions: Float32Array | null = null

const DELTA_EPSILON = 0.18
const FULL_SNAPSHOT_EVERY = 18

const post = (message: CrowdWorkerOutMessage, transfer: Transferable[] = []) => {
  self.postMessage(message, transfer)
}

const stopLoop = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const shouldRun = () => Boolean(engine) && visible && !paused

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const recalcPublishInterval = () => {
  const baseInterval = profileCoarsePointer
    ? profileCount > 180
      ? 66.67
      : profileCount > 100
        ? 50
        : 33.34
    : profileCount > 180
      ? 66.67
      : profileCount > 100
        ? 50
        : 33.34

  if (stepCostEmaMs > 8.2) {
    loadPressure = Math.min(2, loadPressure + 1)
  } else if (stepCostEmaMs > 5.2) {
    loadPressure = Math.max(loadPressure, 1)
  } else if (stepCostEmaMs < 3.4) {
    loadPressure = Math.max(0, loadPressure - 1)
  }

  const interval = baseInterval + loadPressure * 16.67

  publishIntervalMs = clamp(interval, 16.67, 120)
}

const publishSnapshot = (forceFull = false) => {
  if (!engine) return
  const snapshot = engine.snapshot()

  const shouldPublishFull =
    forceFull ||
    !lastPublishedPositions ||
    lastPublishedPositions.length !== snapshot.positions.length ||
    publishSequence % FULL_SNAPSHOT_EVERY === 0

  if (shouldPublishFull) {
    lastPublishedPositions = snapshot.positions.slice()
    post(
      {
        type: 'snapshot-full',
        staticState: {
          linked: snapshot.linked,
          tiers: snapshot.tiers,
          spriteSize: snapshot.spriteSize,
          radius: snapshot.radius,
          count: snapshot.linked.length
        },
        frame: {
          positions: snapshot.positions,
          depthOrder: snapshot.depthOrder
        }
      },
      [
        snapshot.linked.buffer,
        snapshot.tiers.buffer,
        snapshot.positions.buffer,
        snapshot.depthOrder.buffer
      ]
    )
    publishSequence += 1
    return
  }

  const previous = lastPublishedPositions
  if (!previous) {
    publishSnapshot(true)
    return
  }
  const avatarCount = snapshot.linked.length
  const changedAvatarIndices: number[] = []

  for (let i = 0; i < avatarCount; i += 1) {
    const px = i * 2
    const prevX = previous[px]
    const prevY = previous[px + 1]
    const nextX = snapshot.positions[px]
    const nextY = snapshot.positions[px + 1]
    if (Math.abs(nextX - prevX) > DELTA_EPSILON || Math.abs(nextY - prevY) > DELTA_EPSILON) {
      changedAvatarIndices.push(i)
      previous[px] = nextX
      previous[px + 1] = nextY
    }
  }

  if (changedAvatarIndices.length === 0) {
    // Preserve depth ordering updates even when movement is tiny.
    post(
      {
        type: 'snapshot-delta',
        frame: {
          changedIndices: new Uint16Array(),
          positions: new Float32Array(),
          depthOrder: snapshot.depthOrder
        }
      },
      [snapshot.depthOrder.buffer]
    )
    publishSequence += 1
    return
  }

  // If most avatars changed, full transfer is usually cheaper than large sparse payloads.
  if (changedAvatarIndices.length > avatarCount * 0.66) {
    lastPublishedPositions = snapshot.positions.slice()
    post(
      {
        type: 'snapshot-full',
        staticState: {
          linked: snapshot.linked,
          tiers: snapshot.tiers,
          spriteSize: snapshot.spriteSize,
          radius: snapshot.radius,
          count: snapshot.linked.length
        },
        frame: {
          positions: snapshot.positions,
          depthOrder: snapshot.depthOrder
        }
      },
      [
        snapshot.linked.buffer,
        snapshot.tiers.buffer,
        snapshot.positions.buffer,
        snapshot.depthOrder.buffer
      ]
    )
    publishSequence += 1
    return
  }

  const changedIndices = new Uint16Array(changedAvatarIndices.length)
  const deltaPositions = new Float32Array(changedAvatarIndices.length * 2)
  for (let i = 0; i < changedAvatarIndices.length; i += 1) {
    const avatarIndex = changedAvatarIndices[i]
    changedIndices[i] = avatarIndex
    const sourceOffset = avatarIndex * 2
    const targetOffset = i * 2
    deltaPositions[targetOffset] = snapshot.positions[sourceOffset]
    deltaPositions[targetOffset + 1] = snapshot.positions[sourceOffset + 1]
  }

  post(
    {
      type: 'snapshot-delta',
      frame: {
        changedIndices,
        positions: deltaPositions,
        depthOrder: snapshot.depthOrder
      }
    },
    [changedIndices.buffer, deltaPositions.buffer, snapshot.depthOrder.buffer]
  )
  publishSequence += 1
}

const tick = () => {
  if (!engine) return

  const current = performance.now()
  if (!lastTick) lastTick = current

  const frameDt = Math.min(current - lastTick, 100)
  lastTick = current
  nowTime += frameDt

  if (!shouldRun()) return

  accumulator += frameDt
  let steps = 0

  while (accumulator >= FIXED_STEP_MS && steps < 3) {
    const stepStart = performance.now()
    engine.step(FIXED_STEP_MS, nowTime)
    const stepCostMs = performance.now() - stepStart
    stepCostEmaMs = stepCostEmaMs === 0 ? stepCostMs : stepCostEmaMs * 0.9 + stepCostMs * 0.1
    accumulator -= FIXED_STEP_MS
    steps += 1
  }

  if (steps > 0) {
    recalcPublishInterval()

    if (lastPublishTs === 0 || current - lastPublishTs >= publishIntervalMs) {
      publishSnapshot()
      lastPublishTs = current
    }

    if (lastTelemetryTs === 0 || current - lastTelemetryTs >= 1000) {
      post({
        type: 'telemetry',
        publishIntervalMs,
        stepCostEmaMs
      })
      lastTelemetryTs = current
    }
  }
}

const startLoop = () => {
  stopLoop()
  lastTick = 0
  accumulator = 0
  lastPublishTs = 0
  lastTelemetryTs = 0
  stepCostEmaMs = 0
  loadPressure = 0
  publishSequence = 0
  lastPublishedPositions = null
  timer = setInterval(tick, 16)
}

self.onmessage = (event: MessageEvent<CrowdWorkerInMessage>) => {
  const message = event.data

  if (message.type === 'init') {
    try {
      profileCount = Math.max(0, message.config.count)
      profileCoarsePointer = message.config.coarsePointer
      recalcPublishInterval()
      engine = new CrowdPhysicsEngine(message.config)
      startLoop()
      publishSnapshot(true)
      post({ type: 'ready' })
    } catch (error) {
      post({ type: 'error', message: error instanceof Error ? error.message : 'Init failed' })
    }
    return
  }

  if (!engine && message.type !== 'dispose') return

  switch (message.type) {
    case 'resize':
      engine?.setRadius(message.radius)
      publishSnapshot(true)
      break
    case 'visibility':
      visible = message.visible
      break
    case 'pause':
      paused = true
      break
    case 'resume':
      paused = false
      break
    case 'dispose':
      stopLoop()
      engine = null
      lastPublishedPositions = null
      break
  }
}
