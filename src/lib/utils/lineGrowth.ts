// Growth-sequenced connection lines for the tree's cinematic intro: instead
// of one path revealing start-to-end in whatever order its segments were
// written (a diagonal top-left/bottom-right sweep), a "growth tree" splits a
// line into independently-revealed sub-segments that grow from a card or a
// union point towards the next one, and can trigger nested branches partway
// through their own growth (e.g. a child's vertical starting the instant an
// outward-growing horizontal bus passes that child's position).
import type { Point } from './connectionLines'

export interface GrowSegment {
  id: string
  d: string
  // Nested segments that start growing once THIS segment's own reveal
  // reaches `atFraction` of its length (1 = only after it fully lands).
  branches: Array<{ atFraction: number; segment: GrowSegment }>
}

export interface GrowBox {
  left: number
  top: number
  width: number
  height: number
}

const segmentPath = (from: Point, to: Point, left: number, top: number) =>
  `M${from.x - left} ${from.y - top} L${to.x - left} ${to.y - top}`

const growSegment = (
  id: string,
  from: Point,
  to: Point,
  left: number,
  top: number,
  branches: GrowSegment['branches'] = []
): GrowSegment => ({ id, d: segmentPath(from, to, left, top), branches })

export const growBounds = (points: Point[]): GrowBox => {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)

  return {
    left,
    top,
    width: Math.max(Math.max(...xs) - left, 1),
    height: Math.max(Math.max(...ys) - top, 1)
  }
}

// One or two horizontal bus segments growing OUTWARD from originX at busY
// (never a left-to-right sweep): each one triggers its children's vertical
// drops the instant it passes their x position, while the rest of that same
// side keeps travelling towards its own end.
export const busSpreadSegments = (
  originX: number,
  busY: number,
  childrenCenters: Point[],
  left: number,
  top: number,
  idPrefix: string
): GrowSegment[] => {
  const side = (children: Point[], edgeX: number, idSuffix: string): GrowSegment | null => {
    if (children.length === 0) return null
    const span = Math.abs(edgeX - originX) || 1
    const branches = children.map((child, index) => ({
      atFraction: Math.min(1, Math.abs(child.x - originX) / span),
      segment: growSegment(
        `${idPrefix}-drop-${idSuffix}-${index}`,
        { x: child.x, y: busY },
        child,
        left,
        top
      )
    }))

    return growSegment(
      `${idPrefix}-bus-${idSuffix}`,
      { x: originX, y: busY },
      { x: edgeX, y: busY },
      left,
      top,
      branches
    )
  }

  const leftChildren = childrenCenters.filter(({ x }) => x < originX)
  const rightChildren = childrenCenters.filter(({ x }) => x >= originX)
  const leftEdge = leftChildren.length > 0 ? Math.min(...leftChildren.map(({ x }) => x)) : originX
  const rightEdge =
    rightChildren.length > 0 ? Math.max(...rightChildren.map(({ x }) => x)) : originX

  return [side(leftChildren, leftEdge, 'left'), side(rightChildren, rightEdge, 'right')].filter(
    (segment): segment is GrowSegment => Boolean(segment)
  )
}

// A vertical trunk (a couple's or single parent's drop towards their
// children) that only spreads its bus once it has fully landed.
const trunkGrowTree = (
  origin: Point,
  childrenCenters: Point[],
  busY: number,
  left: number,
  top: number,
  idPrefix: string
): GrowSegment => {
  const busSegments = busSpreadSegments(origin.x, busY, childrenCenters, left, top, idPrefix)
  return growSegment(
    idPrefix,
    origin,
    { x: origin.x, y: busY },
    left,
    top,
    busSegments.map((segment) => ({ atFraction: 1, segment }))
  )
}

// A couple's line: two equal halves growing from each partner's card inward
// to meet at the center - the trunk towards their children (if any) only
// starts once both halves have arrived.
export const coupleGrowTree = (
  memberCenter: Point,
  partnerCenter: Point,
  childrenCenters: Point[],
  busY: number
): { box: GrowBox; roots: GrowSegment[] } => {
  const junction: Point = { x: (memberCenter.x + partnerCenter.x) / 2, y: memberCenter.y }

  if (childrenCenters.length === 0) {
    const box = growBounds([memberCenter, partnerCenter])
    return {
      box,
      roots: [
        growSegment('couple-half-member', memberCenter, junction, box.left, box.top),
        growSegment('couple-half-partner', partnerCenter, junction, box.left, box.top)
      ]
    }
  }

  const busXs = [junction.x, ...childrenCenters.map(({ x }) => x)]
  const box = growBounds([
    memberCenter,
    partnerCenter,
    { x: junction.x, y: busY },
    { x: Math.min(...busXs), y: busY },
    { x: Math.max(...busXs), y: busY },
    ...childrenCenters
  ])
  const trunk = trunkGrowTree(junction, childrenCenters, busY, box.left, box.top, 'couple-trunk')

  return {
    box,
    roots: [
      growSegment('couple-half-member', memberCenter, junction, box.left, box.top, [
        { atFraction: 1, segment: trunk }
      ]),
      growSegment('couple-half-partner', partnerCenter, junction, box.left, box.top)
    ]
  }
}

// A single parent's drop towards their children: trunk down, then bus out.
export const singleParentGrowTree = (
  origin: Point,
  childrenCenters: Point[],
  busY: number
): { box: GrowBox; roots: GrowSegment[] } => {
  const busXs = [origin.x, ...childrenCenters.map(({ x }) => x)]
  const box = growBounds([
    origin,
    { x: origin.x, y: busY },
    { x: Math.min(...busXs), y: busY },
    { x: Math.max(...busXs), y: busY },
    ...childrenCenters
  ])

  return {
    box,
    roots: [trunkGrowTree(origin, childrenCenters, busY, box.left, box.top, 'single-parent-trunk')]
  }
}

// A previous partner's shared children: one continuous stroke from the
// member's badge down, across to the (virtual) drop point and down to the
// bus height - already flows card-to-union in the right order, so it grows
// as a single phase - then the bus spreads out from that drop point.
// `idPrefix` must be unique per previous-partner entry when a member has
// more than one, so their segment ids never collide in the same DOM.
export const previousPartnerChildrenGrowTree = (
  memberExit: Point,
  coupleY: number,
  dropX: number,
  busY: number,
  childrenCenters: Point[],
  idPrefix = 'prev'
): { box: GrowBox; roots: GrowSegment[] } => {
  const busXs = [dropX, ...childrenCenters.map(({ x }) => x)]
  const box = growBounds([
    memberExit,
    { x: memberExit.x, y: coupleY },
    { x: dropX, y: coupleY },
    { x: dropX, y: busY },
    { x: Math.min(...busXs), y: busY },
    { x: Math.max(...busXs), y: busY },
    ...childrenCenters
  ])
  const busSegments = busSpreadSegments(
    dropX,
    busY,
    childrenCenters,
    box.left,
    box.top,
    `${idPrefix}-bus`
  )

  const d = [
    segmentPath(memberExit, { x: memberExit.x, y: coupleY }, box.left, box.top),
    segmentPath({ x: memberExit.x, y: coupleY }, { x: dropX, y: coupleY }, box.left, box.top),
    segmentPath({ x: dropX, y: coupleY }, { x: dropX, y: busY }, box.left, box.top)
  ].join(' ')

  return {
    box,
    roots: [
      {
        id: `${idPrefix}-trunk`,
        d,
        branches: busSegments.map((segment) => ({ atFraction: 1, segment }))
      }
    ]
  }
}

// Depth-first list of every segment in a growth tree (self + all branches,
// recursively) - used to hide everything up front before any reveal starts.
export const flattenGrowSegments = (segments: GrowSegment[]): GrowSegment[] =>
  segments.flatMap((segment) => [
    segment,
    ...flattenGrowSegments(segment.branches.map(({ segment: branch }) => branch))
  ])

// Worst-case total px length from the start of `segments` (running in
// parallel) to the furthest-finishing leaf, accounting for branches that
// start partway through their parent's own growth. Used to derive a single
// px/ms speed so the whole tree finishes within a given time budget.
export const growCriticalPathLength = (
  segments: GrowSegment[],
  lengthOf: (id: string) => number
): number =>
  Math.max(
    0,
    ...segments.map((segment) => {
      const length = lengthOf(segment.id)
      const branchesCritical = Math.max(
        0,
        ...segment.branches.map(
          ({ atFraction, segment: branch }) =>
            length * atFraction + growCriticalPathLength([branch], lengthOf)
        )
      )
      return Math.max(length, branchesCritical)
    })
  )

// Hides every segment in the tree (stroke-dasharray/dashoffset set to its
// own measured length, no transition) so nothing is visible until its
// scheduled reveal below runs.
export const hideGrowSegments = (
  segments: GrowSegment[],
  findPath: (id: string) => SVGPathElement | null
) => {
  flattenGrowSegments(segments).forEach((segment) => {
    const path = findPath(segment.id)
    if (!path) return
    const length = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
  })
}

// Schedules each segment's own stroke-dashoffset transition (duration
// proportional to its own length at the given speed), starting `delayMs`
// after the reveal begins; each branch starts partway through its parent's
// own growth (atFraction), not after the parent fully finishes.
export const scheduleGrowReveal = (
  segments: GrowSegment[],
  findPath: (id: string) => SVGPathElement | null,
  speedPxPerMs: number,
  delayMs = 0
) => {
  segments.forEach((segment) => {
    const path = findPath(segment.id)
    const length = path?.getTotalLength() ?? 0
    const durationMs = speedPxPerMs > 0 ? length / speedPxPerMs : 0

    setTimeout(() => {
      if (!path) return
      path.style.transition = `stroke-dashoffset ${durationMs}ms linear`
      path.style.strokeDashoffset = '0'
    }, delayMs)

    segment.branches.forEach(({ atFraction, segment: branch }) => {
      scheduleGrowReveal([branch], findPath, speedPxPerMs, delayMs + durationMs * atFraction)
    })
  })
}

// Safety net: snap every segment fully visible with no transition (e.g. the
// intro was skipped/aborted before this tree's natural turn came up).
export const revealGrowSegmentsInstantly = (
  segments: GrowSegment[],
  findPath: (id: string) => SVGPathElement | null
) => {
  flattenGrowSegments(segments).forEach((segment) => {
    const path = findPath(segment.id)
    if (!path) return
    path.style.transition = 'none'
    path.style.strokeDashoffset = '0'
  })
}
