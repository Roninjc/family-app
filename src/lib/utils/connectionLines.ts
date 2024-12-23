export const getMemberCenter = (memberId: string) => {
  const elemPos = document.getElementById(memberId)?.getBoundingClientRect()
  let center = undefined

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
