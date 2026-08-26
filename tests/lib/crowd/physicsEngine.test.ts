import { describe, expect, it } from 'vitest'
import { CrowdPhysicsEngine } from '$lib/crowd/physicsEngine'

const runSteps = (engine: CrowdPhysicsEngine, steps: number, stepMs = 1000 / 30) => {
  let time = 0
  for (let i = 0; i < steps; i += 1) {
    time += stepMs
    engine.step(stepMs, time)
  }
}

describe('CrowdPhysicsEngine collisions', () => {
  it('keeps avatars inside the configured arena radius', () => {
    const radius = 118
    const engine = new CrowdPhysicsEngine({
      seedKey: 'bounds-seed',
      count: 120,
      unlinkedCount: 36,
      radius,
      coarsePointer: false
    })

    runSteps(engine, 360)

    const snapshot = engine.snapshot()
    let maxDistance = 0
    for (let i = 0; i < snapshot.linked.length; i += 1) {
      const x = snapshot.positions[i * 2]
      const y = snapshot.positions[i * 2 + 1]
      maxDistance = Math.max(maxDistance, Math.hypot(x, y))
    }

    expect(maxDistance).toBeLessThanOrEqual(radius)
  })

  it('avoids severe overlaps in dense scenes after settling', () => {
    const engine = new CrowdPhysicsEngine({
      seedKey: 'dense-overlap-seed',
      count: 120,
      unlinkedCount: 40,
      radius: 124,
      coarsePointer: false
    })

    runSteps(engine, 420)

    const snapshot = engine.snapshot()
    let minDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < snapshot.linked.length; i += 1) {
      const ax = snapshot.positions[i * 2]
      const ay = snapshot.positions[i * 2 + 1]
      for (let j = i + 1; j < snapshot.linked.length; j += 1) {
        const bx = snapshot.positions[j * 2]
        const by = snapshot.positions[j * 2 + 1]
        const distance = Math.hypot(ax - bx, ay - by)
        if (distance < minDistance) {
          minDistance = distance
        }
      }
    }

    expect(minDistance).toBeGreaterThan(1.3)
  })
})
