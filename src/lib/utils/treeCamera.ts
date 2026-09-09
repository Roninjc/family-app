// Pure camera geometry helpers: no DOM access, only plain rects/numbers so
// they stay unit-testable and reusable by the future cinematic intro.

export type Rect = { left: number; top: number; width: number; height: number }
export type Camera = { scale: number; x: number; y: number }

export const MIN_SCALE = 0.15
export const MAX_SCALE = 2.5

export const clampScale = (scale: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

// Keeps at least `minVisible` px of the content rect inside the viewport on
// each axis, so the tree can never be dragged fully out of view.
export const clampPan = (
  camera: Camera,
  contentRect: Rect,
  viewportRect: Rect,
  minVisible = 80
): Camera => {
  const scaledWidth = contentRect.width * camera.scale
  const scaledHeight = contentRect.height * camera.scale

  const minX = minVisible - scaledWidth - contentRect.left * camera.scale
  const maxX = viewportRect.width - minVisible - contentRect.left * camera.scale
  const minY = minVisible - scaledHeight - contentRect.top * camera.scale
  const maxY = viewportRect.height - minVisible - contentRect.top * camera.scale

  return {
    scale: camera.scale,
    x: Math.min(Math.max(camera.x, Math.min(minX, maxX)), Math.max(minX, maxX)),
    y: Math.min(Math.max(camera.y, Math.min(minY, maxY)), Math.max(minY, maxY))
  }
}

// Translate needed so `targetRect`'s center lands at the viewport's center,
// at the given scale. Rects are expected in the same (unscaled content)
// coordinate space.
export const centerOnRect = (targetRect: Rect, viewportRect: Rect, scale: number): Camera => {
  const targetCenterX = targetRect.left + targetRect.width / 2
  const targetCenterY = targetRect.top + targetRect.height / 2
  const viewportCenterX = viewportRect.width / 2
  const viewportCenterY = viewportRect.height / 2

  return {
    scale,
    x: viewportCenterX - targetCenterX * scale,
    y: viewportCenterY - targetCenterY * scale
  }
}

// Scale + translate needed so the whole `contentRect` fits inside
// `viewportRect` with `padding` px of breathing room on each side. Horizontal
// is centered, but vertical anchors the content's top edge just below the
// padding so any leftover space on short trees stays at the bottom rather
// than being split above/below. Not used by phase-1 manual zoom/pan, but
// built now for the future cinematic intro.
export const fitRectToViewport = (contentRect: Rect, viewportRect: Rect, padding = 40): Camera => {
  const availableWidth = Math.max(viewportRect.width - padding * 2, 1)
  const availableHeight = Math.max(viewportRect.height - padding * 2, 1)

  const fitScale = clampScale(
    Math.min(
      availableWidth / Math.max(contentRect.width, 1),
      availableHeight / Math.max(contentRect.height, 1)
    )
  )

  const centered = centerOnRect(contentRect, viewportRect, fitScale)
  return { ...centered, y: padding - contentRect.top * fitScale }
}

// Keeps the content point under the cursor/pinch-centroid fixed while the
// scale changes, so zooming feels anchored rather than jumping to center.
export const zoomAroundPoint = (
  camera: Camera,
  focalPoint: { x: number; y: number },
  nextScale: number
): Camera => {
  const clamped = clampScale(nextScale)
  const contentX = (focalPoint.x - camera.x) / camera.scale
  const contentY = (focalPoint.y - camera.y) / camera.scale

  return {
    scale: clamped,
    x: focalPoint.x - contentX * clamped,
    y: focalPoint.y - contentY * clamped
  }
}
