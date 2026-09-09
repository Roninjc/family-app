import { describe, expect, it } from 'vitest'
import {
  centerOnRect,
  clampPan,
  clampScale,
  fitRectToViewport,
  zoomAroundPoint,
  MIN_SCALE,
  MAX_SCALE
} from '$lib/utils/treeCamera'

const viewport = { left: 0, top: 0, width: 400, height: 300 }

describe('clampScale', () => {
  it('clamps below MIN_SCALE and above MAX_SCALE', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE)
    expect(clampScale(10)).toBe(MAX_SCALE)
    expect(clampScale(1)).toBe(1)
  })
})

describe('centerOnRect', () => {
  it('centers the target rect in the viewport at the given scale', () => {
    const target = { left: 100, top: 50, width: 40, height: 20 }
    const result = centerOnRect(target, viewport, 1)

    // target center (120, 60) should land at viewport center (200, 150)
    expect(result.scale).toBe(1)
    expect(result.x).toBeCloseTo(80)
    expect(result.y).toBeCloseTo(90)
  })

  it('scales the translate to account for a non-1 scale', () => {
    const target = { left: 100, top: 50, width: 40, height: 20 }
    const result = centerOnRect(target, viewport, 2)

    expect(result.x).toBeCloseTo(200 - 120 * 2)
    expect(result.y).toBeCloseTo(150 - 60 * 2)
  })
})

describe('fitRectToViewport', () => {
  it('fits a wide content rect within the viewport with padding', () => {
    const content = { left: 0, top: 0, width: 600, height: 300 }
    const result = fitRectToViewport(content, viewport, 40)

    const availableWidth = viewport.width - 80
    expect(result.scale).toBeCloseTo(availableWidth / content.width)
  })

  it('never exceeds MAX_SCALE for tiny content', () => {
    const content = { left: 0, top: 0, width: 10, height: 10 }
    const result = fitRectToViewport(content, viewport, 10)
    expect(result.scale).toBeLessThanOrEqual(MAX_SCALE)
  })

  it('shrinks below the old fixed 0.4 floor so very wide trees still fit narrow screens', () => {
    const narrowViewport = { left: 0, top: 0, width: 380, height: 800 }
    const content = { left: 0, top: 0, width: 2400, height: 400 }
    const result = fitRectToViewport(content, narrowViewport, 20)

    expect(result.scale).toBeLessThan(0.4)
    const contentWidthOnScreen = content.width * result.scale
    expect(contentWidthOnScreen).toBeLessThanOrEqual(narrowViewport.width)
  })

  it('anchors the content top just below the padding instead of vertically centering', () => {
    const content = { left: 0, top: 0, width: 300, height: 60 }
    const result = fitRectToViewport(content, viewport, 40)

    // content top edge should land at `padding` px from the viewport top...
    expect(result.y).toBeCloseTo(40)
    // ...leaving the leftover vertical space below the (short) content.
    const contentBottomOnScreen = result.y + content.height * result.scale
    expect(contentBottomOnScreen).toBeLessThan(viewport.height)
  })

  it('centers horizontally while keeping the top anchor', () => {
    const content = { left: 20, top: 0, width: 100, height: 60 }
    const result = fitRectToViewport(content, viewport, 40)
    const centered = centerOnRect(content, viewport, result.scale)

    expect(result.x).toBeCloseTo(centered.x)
  })
})

describe('zoomAroundPoint', () => {
  it('keeps the content point under the focal point fixed while scaling', () => {
    const camera = { scale: 1, x: 0, y: 0 }
    const focal = { x: 150, y: 80 }
    const result = zoomAroundPoint(camera, focal, 2)

    // the content point under the focal point before zoom...
    const contentX = (focal.x - camera.x) / camera.scale
    const contentY = (focal.y - camera.y) / camera.scale
    // ...should map back to the same focal point after zoom
    expect(contentX * result.scale + result.x).toBeCloseTo(focal.x)
    expect(contentY * result.scale + result.y).toBeCloseTo(focal.y)
  })

  it('clamps the resulting scale', () => {
    const camera = { scale: 1, x: 0, y: 0 }
    const result = zoomAroundPoint(camera, { x: 0, y: 0 }, 100)
    expect(result.scale).toBe(MAX_SCALE)
  })
})

describe('clampPan', () => {
  it('keeps camera unchanged when content already fits within bounds', () => {
    const content = { left: 0, top: 0, width: 100, height: 100 }
    const camera = { scale: 1, x: 150, y: 100 }
    const result = clampPan(camera, content, viewport, 80)
    expect(result.x).toBe(camera.x)
    expect(result.y).toBe(camera.y)
  })

  it('prevents dragging content fully out of the viewport', () => {
    const content = { left: 0, top: 0, width: 2000, height: 2000 }
    const camera = { scale: 1, x: -100000, y: -100000 }
    const result = clampPan(camera, content, viewport, 80)

    // right/bottom edge of content must remain at least minVisible inside viewport
    expect(result.x + content.width).toBeGreaterThanOrEqual(80)
    expect(result.y + content.height).toBeGreaterThanOrEqual(80)
  })
})
