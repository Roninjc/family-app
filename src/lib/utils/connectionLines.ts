import type { PreviousPartnerRealtionInfo } from '$lib/types/familyTypes'

export const getMemberCenter = (memberId: string) => {
  const elemPos = document.getElementById(memberId)?.getBoundingClientRect()
  let center = { x: 0, y: 0 }

  if (elemPos) {
    const { left, width, top, height } = elemPos
    const elemCenter = {
      x: left + width / 2,
      y: top + height / 2
    }

    if (!isNaN(elemCenter.x) && !isNaN(elemCenter.y)) {
      center = elemCenter
    }
  }

  return center
}

export const getSvgCoordinates = (
  memberCenter: { x: number; y: number },
  partnerCenter: { x: number; y: number },
  childrenCenter: { x: number; y: number }[]
) => {
  const childrenX = childrenCenter.map((child) => child.x)
  const childrenY = childrenCenter.map((child) => child.y)

  const left = Math.min(memberCenter?.x, partnerCenter?.x, ...childrenX)
  const right = Math.max(memberCenter?.x, partnerCenter?.x, ...childrenX)
  const top = Math.min(memberCenter?.y, partnerCenter?.y, ...childrenY)
  const bottom = Math.max(memberCenter?.y, partnerCenter?.y, ...childrenY)

  return {
    left,
    right,
    top,
    bottom
  }
}

export const getPreviousPartnerChildrenLinesCoordinates = (
  previousPartnerRelationInfo: PreviousPartnerRealtionInfo,
  amountOfPreviousPartners: number,
  previousPartnerIndex: number
): {
  memberConnectionX: number
  coupleHeight: number
  coupleChildrenConnectorX: number
  childrenHeight: number
  coupleChildrenHorizontalLine: { start: number; end: number }
} => {
  let memberConnectionX = 0
  let coupleHeight = 0
  let coupleChildrenConnectorX = 0
  let childrenHeight = 0
  const coupleChildrenHorizontalLine = { start: 0, end: 0 }

  if (amountOfPreviousPartners === 1 && previousPartnerIndex === 0) {
    coupleHeight = 100
    childrenHeight = 130
  }

  if (amountOfPreviousPartners > 1) {
    const memberConnectorSpacing = 7
    memberConnectionX = (amountOfPreviousPartners - previousPartnerIndex) * memberConnectorSpacing
    const steps = amountOfPreviousPartners * 2 + 2
    const height = 70 / steps
    coupleHeight = 80 + height * (previousPartnerIndex + 1)
    childrenHeight = 150 - height * (previousPartnerIndex + 1)
  }

  if (previousPartnerRelationInfo.childrenCenter.length === 1) {
    coupleChildrenConnectorX = 75 + 20
    coupleChildrenHorizontalLine.start = coupleChildrenConnectorX
    coupleChildrenHorizontalLine.end = Math.abs(
      previousPartnerRelationInfo.svgCoordinates.left -
        previousPartnerRelationInfo?.childrenCenter[0]?.x
    )
  }

  if (previousPartnerRelationInfo.childrenCenter.length > 1) {
    const mostLeftChild = previousPartnerRelationInfo.childrenCenter.reduce((prev, current) => {
      return current.x < prev.x ? current : prev
    })
    const mostRightChild = previousPartnerRelationInfo.childrenCenter.reduce((prev, current) => {
      return current.x > prev.x ? current : prev
    })
    coupleChildrenHorizontalLine.start = Math.abs(
      previousPartnerRelationInfo.svgCoordinates.left - mostLeftChild.x
    )
    coupleChildrenHorizontalLine.end = Math.abs(
      previousPartnerRelationInfo.svgCoordinates.left - mostRightChild.x
    )
    coupleChildrenConnectorX = 75 + 20
  }
  return {
    memberConnectionX,
    coupleHeight,
    coupleChildrenConnectorX,
    childrenHeight,
    coupleChildrenHorizontalLine
  }
}
