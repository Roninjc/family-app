// Geometry of the tree lines. All coordinates are relative to the member's
// couple-wrapper (supplied by connectionLines.svelte after measuring the
// DOM), so nothing here assumes badge sizes or gaps.

export interface Point {
  x: number
  y: number
}

// Measured box of a badge: center + vertical edges
export interface MemberBox {
  center: Point
  top: number
  bottom: number
}

// An absolutely positioned SVG inside the couple-wrapper, with its path in
// local coordinates
export interface LineSpec {
  left: number
  top: number
  width: number
  height: number
  d: string
}

interface Segment {
  from: Point
  to: Point
}

const specFromSegments = (segments: Segment[]): LineSpec => {
  const xs = segments.flatMap(({ from, to }) => [from.x, to.x])
  const ys = segments.flatMap(({ from, to }) => [from.y, to.y])
  const left = Math.min(...xs)
  const top = Math.min(...ys)

  return {
    left,
    top,
    width: Math.max(Math.max(...xs) - left, 1),
    height: Math.max(Math.max(...ys) - top, 1),
    d: segments
      .map(({ from, to }) => `M${from.x - left} ${from.y - top} L${to.x - left} ${to.y - top}`)
      .join(' ')
  }
}

// Height of the horizontal children line: midpoint of the gap between the
// parents' row and the children's row
export const midGapY = (parentsBottomY: number, childrenTopY: number) =>
  (parentsBottomY + childrenTopY) / 2

// A badge can have several "exits" toward children (previous-partner stubs
// and the single-parent drop). To keep each line traceable, they are spread
// symmetrically around the badge center: previous partners on the left (in
// order) and the single-parent exit rightmost.
export const memberExitOffsets = (
  previousFamiliesCount: number,
  hasSingleParentExit: boolean,
  spacing = 12
): { previousPartnerOffsets: number[]; singleParentOffset: number } => {
  const totalExits = previousFamiliesCount + (hasSingleParentExit ? 1 : 0)
  const offsetAt = (exitIndex: number) =>
    totalExits > 1 ? (exitIndex - (totalExits - 1) / 2) * spacing : 0

  return {
    previousPartnerOffsets: Array.from({ length: previousFamiliesCount }, (_, index) =>
      offsetAt(index)
    ),
    singleParentOffset: offsetAt(totalExits - 1)
  }
}

// Horizontal line between a couple's centers (the dashed previous-partner
// line uses this same spec with a different CSS class)
export const coupleLineSpec = (memberCenter: Point, partnerCenter: Point): LineSpec =>
  specFromSegments([{ from: memberCenter, to: partnerCenter }])

// Past partners without common children still connect under both badges,
// so the relationship is visible without crossing through names/avatars.
export const previousPartnerNoChildrenSpec = (
  member: MemberBox,
  previousPartner: MemberBox,
  previousPartnerIndex: number,
  amountOfPreviousPartners: number,
  memberStubOffset = 0,
  extraGap = 18
): LineSpec => {
  const memberX = member.center.x + memberStubOffset
  const baseY = Math.max(member.bottom, previousPartner.bottom) + extraGap
  const steps = Math.max(amountOfPreviousPartners, 1)
  const step = 10
  const joinY = baseY + (steps - previousPartnerIndex - 1) * step

  return specFromSegments([
    { from: { x: memberX, y: member.bottom }, to: { x: memberX, y: joinY } },
    {
      from: { x: Math.min(memberX, previousPartner.center.x), y: joinY },
      to: { x: Math.max(memberX, previousPartner.center.x), y: joinY }
    },
    {
      from: { x: previousPartner.center.x, y: joinY },
      to: { x: previousPartner.center.x, y: previousPartner.bottom }
    }
  ])
}

// Drop from junction, horizontal line (bus) at busY and a drop to each
// child's center. junction is the couple's midpoint (at their line's height)
// or the single parent's center.
export const childrenLinesSpec = (
  junction: Point,
  childrenCenters: Point[],
  busY: number
): LineSpec => {
  const busXs = [junction.x, ...childrenCenters.map(({ x }) => x)]
  const busStart = Math.min(...busXs)
  const busEnd = Math.max(...busXs)

  return specFromSegments([
    { from: junction, to: { x: junction.x, y: busY } },
    { from: { x: busStart, y: busY }, to: { x: busEnd, y: busY } },
    ...childrenCenters.map((childCenter) => ({
      from: { x: childCenter.x, y: busY },
      to: childCenter
    }))
  ])
}

// Staggered heights of a previous family within the inter-row gap: the
// couple junction comes down from the top and their children's bus comes up
// from the bottom, one step per previous partner so several don't overlap.
export const previousPartnerHeights = (
  gapTop: number,
  childrenTopY: number,
  previousPartnerIndex: number,
  amountOfPreviousPartners: number
): { coupleY: number; busY: number } => {
  const gapHeight = Math.max(childrenTopY - gapTop, 24)
  const steps = amountOfPreviousPartners * 2 + 2
  const offset = (gapHeight * (previousPartnerIndex + 1)) / steps

  return { coupleY: gapTop + offset, busY: childrenTopY - offset }
}

// A previous partner's family, in two strokes: solid from the member to
// their children (parenthood does not expire) and dashed only from the
// intersection to the previous partner (past relationship).
export const previousPartnerFamilySpecs = (
  member: MemberBox,
  previousPartner: MemberBox,
  childrenCenters: Point[],
  childrenTopY: number,
  previousPartnerIndex: number,
  amountOfPreviousPartners: number,
  // Horizontal offset of the exit on the badge (see memberExitOffsets)
  memberStubOffset = 0
): { memberToChildren: LineSpec; toPreviousPartner: LineSpec } => {
  const { coupleY, busY } = previousPartnerHeights(
    Math.max(member.bottom, previousPartner.bottom),
    childrenTopY,
    previousPartnerIndex,
    amountOfPreviousPartners
  )
  const memberX = member.center.x + memberStubOffset
  const dropX = (member.center.x + previousPartner.center.x) / 2
  const busXs = [dropX, ...childrenCenters.map(({ x }) => x)]
  // The stub rising to the previous partner's badge is shifted toward the
  // member's side: the previous partner's own exits to their other children
  // start at their exact center (drawn by their own node) and would overlap.
  const previousPartnerX =
    previousPartner.center.x + 10 * Math.sign(member.center.x - previousPartner.center.x)

  return {
    memberToChildren: specFromSegments([
      { from: { x: memberX, y: member.bottom }, to: { x: memberX, y: coupleY } },
      { from: { x: memberX, y: coupleY }, to: { x: dropX, y: coupleY } },
      { from: { x: dropX, y: coupleY }, to: { x: dropX, y: busY } },
      { from: { x: Math.min(...busXs), y: busY }, to: { x: Math.max(...busXs), y: busY } },
      ...childrenCenters.map((childCenter) => ({
        from: { x: childCenter.x, y: busY },
        to: childCenter
      }))
    ]),
    toPreviousPartner: specFromSegments([
      { from: { x: dropX, y: coupleY }, to: { x: previousPartnerX, y: coupleY } },
      {
        from: { x: previousPartnerX, y: coupleY },
        to: { x: previousPartnerX, y: previousPartner.bottom }
      }
    ])
  }
}
