import { describe, expect, it } from 'vitest'
import type { MemberBox } from '$lib/utils/connectionLines'
import {
  childrenLinesSpec,
  coupleLineSpec,
  memberExitOffsets,
  midGapY,
  previousPartnerFamilySpecs,
  previousPartnerHeights
} from '$lib/utils/connectionLines'

// Coordinates relative to the couple-wrapper, as produced by the component
const box = (centerX: number, centerY: number, height = 120): MemberBox => ({
  center: { x: centerX, y: centerY },
  top: centerY - height / 2,
  bottom: centerY + height / 2
})

describe('midGapY', () => {
  it('returns the midpoint of the gap between rows', () => {
    expect(midGapY(120, 190)).toBe(155)
  })
})

describe('coupleLineSpec', () => {
  it('draws a horizontal line between the centers, with tight bounds', () => {
    const spec = coupleLineSpec({ x: 75, y: 60 }, { x: 245, y: 60 })

    expect(spec.left).toBe(75)
    expect(spec.top).toBe(60)
    expect(spec.width).toBe(170)
    expect(spec.height).toBe(1) // minimal height, the line is horizontal
    expect(spec.d).toBe('M0 0 L170 0')
  })

  it('works with the partner on the left (previous partner): no negative widths', () => {
    const spec = coupleLineSpec({ x: 75, y: 60 }, { x: -115, y: 60 })

    expect(spec.left).toBe(-115)
    expect(spec.width).toBe(190)
    expect(spec.d).toBe('M190 0 L0 0')
  })
})

describe('childrenLinesSpec', () => {
  it('drop from the junction, horizontal bus and drop to each child', () => {
    const junction = { x: 160, y: 60 }
    const children = [
      { x: 75, y: 250 },
      { x: 245, y: 250 }
    ]

    const spec = childrenLinesSpec(junction, children, 155)

    expect(spec.left).toBe(75)
    expect(spec.top).toBe(60)
    expect(spec.width).toBe(170)
    expect(spec.height).toBe(190)
    // Drop from the junction down to the bus
    expect(spec.d).toContain('M85 0 L85 95')
    // Horizontal bus at the gap height
    expect(spec.d).toContain('M0 95 L170 95')
    // Drops down to the center of each child
    expect(spec.d).toContain('M0 95 L0 190')
    expect(spec.d).toContain('M170 95 L170 190')
  })

  it('the bus covers the junction even when all children sit on one side', () => {
    const spec = childrenLinesSpec({ x: 300, y: 60 }, [{ x: 75, y: 250 }], 155)

    // From the leftmost child (75) to the junction (300)
    expect(spec.left).toBe(75)
    expect(spec.width).toBe(225)
    expect(spec.d).toContain('M0 95 L225 95')
  })
})

describe('previousPartnerHeights', () => {
  it('spreads the join from the top and the children bus from the bottom within the gap', () => {
    // gap 120→190 (70px), 1 previous partner → steps 4
    expect(previousPartnerHeights(120, 190, 0, 1)).toEqual({ coupleY: 137.5, busY: 172.5 })
  })

  it('staggers several previous partners without overlapping', () => {
    const first = previousPartnerHeights(120, 190, 0, 2)
    const second = previousPartnerHeights(120, 190, 1, 2)

    expect(first.coupleY).toBeLessThan(second.coupleY)
    expect(first.busY).toBeGreaterThan(second.busY)
    expect(second.coupleY).toBeLessThan(second.busY)
  })

  it('keeps a minimum gap when the rows are very close together', () => {
    // gapHeight is forced to 24: coupleY = 120 + 24/4 = 126
    expect(previousPartnerHeights(120, 121, 0, 1).coupleY).toBe(126)
  })
})

describe('previousPartnerFamilySpecs', () => {
  const member = box(75, 60)
  const previousPartner = box(-115, 60)
  const children = [{ x: -20, y: 250 }]

  it('continuous solid stroke from the member down to the children', () => {
    const { memberToChildren } = previousPartnerFamilySpecs(
      member,
      previousPartner,
      children,
      190,
      0,
      1,
      -6
    )
    const local = (x: number) => x - memberToChildren.left
    const localY = (y: number) => y - memberToChildren.top

    // Member stub (75 - 6 = 69) down to the join height (137.5)
    expect(memberToChildren.d).toContain(
      `M${local(69)} ${localY(120)} L${local(69)} ${localY(137.5)}`
    )
    // Horizontal to the intersection (midpoint, -20) and drop to the bus
    expect(memberToChildren.d).toContain(
      `M${local(69)} ${localY(137.5)} L${local(-20)} ${localY(137.5)}`
    )
    expect(memberToChildren.d).toContain(
      `M${local(-20)} ${localY(137.5)} L${local(-20)} ${localY(172.5)}`
    )
    // Drop down to the center of the child
    expect(memberToChildren.d).toContain(
      `M${local(-20)} ${localY(172.5)} L${local(-20)} ${localY(250)}`
    )
  })

  it('dashed stroke only from the intersection to the previous partner', () => {
    const { toPreviousPartner } = previousPartnerFamilySpecs(
      member,
      previousPartner,
      children,
      190,
      0,
      1,
      -6
    )
    const local = (x: number) => x - toPreviousPartner.left
    const localY = (y: number) => y - toPreviousPartner.top

    // Horizontal intersection→previous partner and a stub rising to their
    // badge, nothing else. The stub is shifted 10px towards the member
    // (-115 + 10 = -105) to avoid overlapping the previous partner's own
    // exits towards other children.
    expect(toPreviousPartner.d).toBe(
      `M${local(-20)} ${localY(137.5)} L${local(-105)} ${localY(137.5)} ` +
        `M${local(-105)} ${localY(137.5)} L${local(-105)} ${localY(120)}`
    )
  })
})

describe('memberExitOffsets', () => {
  it('a single exit stays centered on the badge', () => {
    expect(memberExitOffsets(1, false).previousPartnerOffsets).toEqual([0])
    expect(memberExitOffsets(0, true).singleParentOffset).toBe(0)
  })

  it('previous partner with children + single parent: the exits spread around the center', () => {
    const { previousPartnerOffsets, singleParentOffset } = memberExitOffsets(1, true)

    expect(previousPartnerOffsets).toEqual([-6])
    expect(singleParentOffset).toBe(6)
  })

  it('several previous partners spread in order, with the single parent on the right', () => {
    const { previousPartnerOffsets, singleParentOffset } = memberExitOffsets(2, true)

    expect(previousPartnerOffsets).toEqual([-12, 0])
    expect(singleParentOffset).toBe(12)
  })
})
