import { writable, get } from 'svelte/store'
import { clampPan, zoomAroundPoint, type Camera, type Rect } from '$lib/utils/treeCamera'

// Camera state (scale + translate) driving the tree viewport transform.
// Module-level so it survives client-side navigation within the same
// browser tab (e.g. leaving the tree for admin/hub-fam and coming back),
// but resets on a full page reload.
export const camera = writable<Camera>({ scale: 1, x: 0, y: 0 })

// True once the user has manually panned/zoomed; while true, the tree page
// stops re-centering the camera on data reloads.
export const hasManualCamera = writable(false)

// True while the cinematic entrance sequence is playing; consumed by
// treeNode/connectionLines to gate their reveal by generation.
export const introActive = writable(false)

// How many generations (oldest = 1) currently have their cards revealed
// during the intro; treeNode compares its own generation against this.
export const revealedGeneration = writable(0)

// How many generations currently have their outgoing connection lines
// drawn/drawing during the intro; connectionLines compares its row member's
// generation against this (always <= revealedGeneration, since a
// generation's lines only start growing once that generation is visible).
export const drawingLevel = writable(0)

// Per-generation-step time budget (ms) for the current intro, set once per
// step by +page.svelte's playIntroSequence; connectionLines derives its
// stroke-growth speed (px/ms) from this so a whole line's growth tree
// (trunk + bus + children, however many phases) finishes within this window
// regardless of how many segments it was split into.
export const introLineBudgetMs = writable(650)

export const setCamera = (next: Camera) => camera.set(next)

export const resetCamera = (next: Camera) => {
  camera.set(next)
  hasManualCamera.set(false)
}

export const panBy = (dx: number, dy: number, contentRect: Rect, viewportRect: Rect) => {
  hasManualCamera.set(true)
  camera.update((current) =>
    clampPan({ ...current, x: current.x + dx, y: current.y + dy }, contentRect, viewportRect)
  )
}

export const zoomBy = (
  scaleFactor: number,
  focalPoint: { x: number; y: number },
  contentRect: Rect,
  viewportRect: Rect
) => {
  hasManualCamera.set(true)
  camera.update((current) => {
    const zoomed = zoomAroundPoint(current, focalPoint, current.scale * scaleFactor)
    return clampPan(zoomed, contentRect, viewportRect)
  })
}

export const currentCamera = () => get(camera)
export const isManualCamera = () => get(hasManualCamera)
