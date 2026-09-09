// Thin DOM glue: tracks active pointers on an element and turns
// drag/pinch/wheel input into camera pan/zoom calls. Kept separate from the
// camera store/math so the gesture wiring can be unit-tested independently.
import type { Rect } from '$lib/utils/treeCamera'

type CameraActions = {
  panBy: (dx: number, dy: number, contentRect: Rect, viewportRect: Rect) => void
  zoomBy: (
    scaleFactor: number,
    focalPoint: { x: number; y: number },
    contentRect: Rect,
    viewportRect: Rect
  ) => void
}

type RectProvider = () => { contentRect: Rect; viewportRect: Rect }

const WHEEL_ZOOM_SENSITIVITY = 0.0015

export const attachTreeGestures = (
  element: HTMLElement,
  actions: CameraActions,
  getRects: RectProvider
): (() => void) => {
  const pointers = new Map<number, { x: number; y: number }>()
  let lastPinchDistance = 0
  let lastPinchCenter = { x: 0, y: 0 }

  const relativePoint = (event: PointerEvent) => {
    const rect = element.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const pinchState = () => {
    const points = [...pointers.values()]
    const [a, b] = points
    const dx = b.x - a.x
    const dy = b.y - a.y
    return {
      distance: Math.hypot(dx, dy),
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    element.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, relativePoint(event))

    if (pointers.size === 2) {
      const state = pinchState()
      lastPinchDistance = state.distance
      lastPinchCenter = state.center
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    const previous = pointers.get(event.pointerId)!
    const next = relativePoint(event)
    pointers.set(event.pointerId, next)

    const { contentRect, viewportRect } = getRects()

    if (pointers.size === 2) {
      const state = pinchState()
      if (lastPinchDistance > 0) {
        const scaleFactor = state.distance / lastPinchDistance
        actions.zoomBy(scaleFactor, state.center, contentRect, viewportRect)
      }
      actions.panBy(
        state.center.x - lastPinchCenter.x,
        state.center.y - lastPinchCenter.y,
        contentRect,
        viewportRect
      )
      lastPinchDistance = state.distance
      lastPinchCenter = state.center
      return
    }

    if (pointers.size === 1) {
      actions.panBy(next.x - previous.x, next.y - previous.y, contentRect, viewportRect)
    }
  }

  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) {
      lastPinchDistance = 0
    }
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const { contentRect, viewportRect } = getRects()
    const rect = element.getBoundingClientRect()
    const focalPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const scaleFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY)
    actions.zoomBy(scaleFactor, focalPoint, contentRect, viewportRect)
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('pointercancel', onPointerUp)
  element.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointermove', onPointerMove)
    element.removeEventListener('pointerup', onPointerUp)
    element.removeEventListener('pointercancel', onPointerUp)
    element.removeEventListener('wheel', onWheel)
  }
}
