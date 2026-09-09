import { describe, expect, it, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { camera, hasManualCamera, resetCamera, panBy, zoomBy } from '../../src/stores/treeCamera'

const viewport = { left: 0, top: 0, width: 400, height: 300 }
const content = { left: 0, top: 0, width: 800, height: 600 }

describe('treeCamera store', () => {
  beforeEach(() => {
    resetCamera({ scale: 1, x: 0, y: 0 })
  })

  it('resetCamera sets the camera and clears the manual flag', () => {
    hasManualCamera.set(true)
    resetCamera({ scale: 1.5, x: 10, y: 20 })

    expect(get(camera)).toEqual({ scale: 1.5, x: 10, y: 20 })
    expect(get(hasManualCamera)).toBe(false)
  })

  it('panBy moves the camera and marks it manual', () => {
    panBy(20, -10, content, viewport)

    expect(get(hasManualCamera)).toBe(true)
    expect(get(camera).x).toBe(20)
    expect(get(camera).y).toBe(-10)
  })

  it('zoomBy scales the camera and marks it manual', () => {
    zoomBy(1.5, { x: 200, y: 150 }, content, viewport)

    expect(get(hasManualCamera)).toBe(true)
    expect(get(camera).scale).toBeCloseTo(1.5)
  })
})
