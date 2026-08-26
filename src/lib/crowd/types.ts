export type CrowdDetailTier = 0 | 1 | 2

export interface CrowdInitConfig {
  seedKey: string
  count: number
  unlinkedCount: number
  radius: number
  coarsePointer: boolean
}

export interface CrowdStepSnapshot {
  positions: Float32Array
  depthOrder: Uint16Array
  linked: Uint8Array
  tiers: Uint8Array
  spriteSize: number
  radius: number
}

export interface CrowdStaticState {
  linked: Uint8Array
  tiers: Uint8Array
  spriteSize: number
  radius: number
  count: number
}

export interface CrowdFrameSnapshotFull {
  positions: Float32Array
  depthOrder: Uint16Array
}

export interface CrowdFrameSnapshotDelta {
  changedIndices: Uint16Array
  positions: Float32Array
  depthOrder: Uint16Array
}

export type CrowdWorkerInMessage =
  | { type: 'init'; config: CrowdInitConfig }
  | { type: 'resize'; radius: number }
  | { type: 'visibility'; visible: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'dispose' }

export type CrowdWorkerOutMessage =
  | { type: 'snapshot-full'; staticState: CrowdStaticState; frame: CrowdFrameSnapshotFull }
  | { type: 'snapshot-delta'; frame: CrowdFrameSnapshotDelta }
  | { type: 'ready' }
  | { type: 'telemetry'; publishIntervalMs: number; stepCostEmaMs: number }
  | { type: 'error'; message: string }
