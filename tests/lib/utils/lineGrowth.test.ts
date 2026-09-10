import { describe, expect, it } from 'vitest'
import {
  busSpreadSegments,
  coupleGrowTree,
  flattenGrowSegments,
  growBounds,
  growCriticalPathLength,
  previousPartnerChildrenGrowTree,
  singleParentGrowTree
} from '$lib/utils/lineGrowth'

describe('growBounds', () => {
  it('unions the bounding box of every point', () => {
    expect(
      growBounds([
        { x: 10, y: 20 },
        { x: -5, y: 40 }
      ])
    ).toEqual({
      left: -5,
      top: 20,
      width: 15,
      height: 20
    })
  })
})

describe('busSpreadSegments', () => {
  it('builds one segment per side, each branching to its own children', () => {
    const segments = busSpreadSegments(
      100,
      50,
      [
        { x: 20, y: 200 },
        { x: 60, y: 200 },
        { x: 180, y: 200 }
      ],
      0,
      0,
      'bus'
    )

    const left = segments.find((segment) => segment.id === 'bus-bus-left')
    const right = segments.find((segment) => segment.id === 'bus-bus-right')

    expect(left).toBeDefined()
    expect(right).toBeDefined()
    expect(left?.branches).toHaveLength(2)
    expect(right?.branches).toHaveLength(1)
    // The nearer-to-origin child (60) reaches a smaller fraction than the
    // farther one (20) on the same (left) side.
    const nearFraction = left?.branches.find((b) => b.segment.id.endsWith('-1'))?.atFraction ?? 0
    const farFraction = left?.branches.find((b) => b.segment.id.endsWith('-0'))?.atFraction ?? 0
    expect(nearFraction).toBeLessThan(farFraction)
  })

  it('omits a side entirely when there are no children there', () => {
    const segments = busSpreadSegments(100, 50, [{ x: 180, y: 200 }], 0, 0, 'bus')

    expect(segments).toHaveLength(1)
    expect(segments[0].id).toBe('bus-bus-right')
  })

  it('treats a child exactly at the origin as belonging to the right side', () => {
    const segments = busSpreadSegments(100, 50, [{ x: 100, y: 200 }], 0, 0, 'bus')

    expect(segments).toHaveLength(1)
    expect(segments[0].branches[0].atFraction).toBe(0)
  })
})

describe('coupleGrowTree', () => {
  it('returns two equal-length halves with no branches when there are no children', () => {
    const { roots } = coupleGrowTree({ x: 0, y: 60 }, { x: 200, y: 60 }, [], 150)

    expect(roots.map((r) => r.id)).toEqual(['couple-half-member', 'couple-half-partner'])
    expect(roots.every((r) => r.branches.length === 0)).toBe(true)
  })

  it('attaches the trunk to one half at fraction 1 when there are children', () => {
    const { roots } = coupleGrowTree({ x: 0, y: 60 }, { x: 200, y: 60 }, [{ x: 100, y: 250 }], 150)

    const memberHalf = roots.find((r) => r.id === 'couple-half-member')
    expect(memberHalf?.branches).toHaveLength(1)
    expect(memberHalf?.branches[0].atFraction).toBe(1)
    expect(memberHalf?.branches[0].segment.id).toBe('couple-trunk')
  })
})

describe('singleParentGrowTree', () => {
  it('produces a single trunk root that branches into the bus', () => {
    const { roots } = singleParentGrowTree(
      { x: 100, y: 60 },
      [
        { x: 20, y: 250 },
        { x: 180, y: 250 }
      ],
      150
    )

    expect(roots).toHaveLength(1)
    expect(roots[0].id).toBe('single-parent-trunk')
    expect(roots[0].branches.map((b) => b.segment.id).sort()).toEqual([
      'single-parent-trunk-bus-left',
      'single-parent-trunk-bus-right'
    ])
  })
})

describe('previousPartnerChildrenGrowTree', () => {
  it('produces a single trunk root that branches into the bus', () => {
    const { roots } = previousPartnerChildrenGrowTree({ x: 69, y: 116 }, 137.5, -20, 172.5, [
      { x: -20, y: 250 }
    ])

    expect(roots).toHaveLength(1)
    expect(roots[0].id).toBe('prev-trunk')
    expect(roots[0].branches).toHaveLength(1)
    expect(roots[0].branches[0].atFraction).toBe(1)
  })
})

describe('flattenGrowSegments', () => {
  it('collects every nested segment, self first', () => {
    const { roots } = coupleGrowTree({ x: 0, y: 60 }, { x: 200, y: 60 }, [{ x: 100, y: 250 }], 150)

    const ids = flattenGrowSegments(roots).map((segment) => segment.id)

    expect(ids).toContain('couple-half-member')
    expect(ids).toContain('couple-half-partner')
    expect(ids).toContain('couple-trunk')
    expect(ids.some((id) => id.startsWith('couple-trunk-bus'))).toBe(true)
    expect(ids.some((id) => id.startsWith('couple-trunk-drop'))).toBe(true)
  })
})

describe('growCriticalPathLength', () => {
  it('is just the longest of several parallel, branch-less roots', () => {
    const { roots } = coupleGrowTree({ x: 0, y: 60 }, { x: 200, y: 60 }, [], 150)

    const length = growCriticalPathLength(roots, () => 42)

    expect(length).toBe(42)
  })

  it('adds a branch critical path scaled by its own atFraction', () => {
    const { roots } = coupleGrowTree({ x: 0, y: 60 }, { x: 200, y: 60 }, [{ x: 100, y: 250 }], 150)

    // Every segment reports a fixed length of 10 for this test, regardless
    // of id, so the math is easy to check by hand: member-half (10) ->
    // trunk at fraction 1 (10) -> bus at fraction 1 (10) -> the single
    // child's drop at fraction 0 (10) = 30.
    const length = growCriticalPathLength(roots, () => 10)

    expect(length).toBe(30)
  })
})
