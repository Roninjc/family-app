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
