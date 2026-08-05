import { describe, expect, it } from 'vitest'
import type { PreviousPartnerRealtionInfo } from '$lib/types/familyTypes'
import { getPreviousPartnerChildrenLinesCoordinates, getSvgCoordinates } from './connectionLines'

const relationInfo = (
  partial: Partial<PreviousPartnerRealtionInfo> = {}
): PreviousPartnerRealtionInfo => ({
  partnerCenter: { x: 0, y: 0 },
  childrenCenter: [],
  svgCoordinates: { left: 0, right: 0, top: 0, bottom: 0 },
  memberConnectorX: 0,
  coupleHeight: 0,
  coupleChildrenConnectorX: 0,
  childrenHeight: 0,
  coupleChildrenHorizontalLine: { start: 0, end: 0 },
  ...partial
})

describe('getSvgCoordinates', () => {
  it('calcula el bounding box de miembro + pareja + hijos', () => {
    const coordinates = getSvgCoordinates({ x: 100, y: 50 }, { x: 300, y: 50 }, [
      { x: 50, y: 200 },
      { x: 350, y: 200 }
    ])

    expect(coordinates).toEqual({ left: 50, right: 350, top: 50, bottom: 200 })
  })

  it('funciona sin pareja y sin hijos (progenitor único aún sin medir hijos)', () => {
    const coordinates = getSvgCoordinates({ x: 100, y: 50 }, undefined, [])

    expect(coordinates).toEqual({ left: 100, right: 100, top: 50, bottom: 50 })
  })
})

describe('getPreviousPartnerChildrenLinesCoordinates', () => {
  it('usa alturas fijas cuando hay una sola expareja', () => {
    const info = relationInfo({
      childrenCenter: [{ x: 200, y: 300 }],
      svgCoordinates: { left: 100, right: 400, top: 50, bottom: 300 }
    })

    const result = getPreviousPartnerChildrenLinesCoordinates(info, 1, 0)

    expect(result.memberConnectorX).toBe(0)
    expect(result.coupleHeight).toBe(100)
    expect(result.childrenHeight).toBe(130)
    // Con un solo hijo la línea horizontal va del conector fijo (75 + 20) al hijo
    expect(result.coupleChildrenConnectorX).toBe(95)
    expect(result.coupleChildrenHorizontalLine).toEqual({ start: 95, end: 100 })
  })

  it('escalona conectores y alturas cuando hay varias exparejas', () => {
    const info = relationInfo({
      childrenCenter: [
        { x: 150, y: 300 },
        { x: 350, y: 300 }
      ],
      svgCoordinates: { left: 100, right: 400, top: 50, bottom: 300 }
    })

    const first = getPreviousPartnerChildrenLinesCoordinates(info, 2, 0)
    const second = getPreviousPartnerChildrenLinesCoordinates(info, 2, 1)

    // El conector del miembro se desplaza 7px por expareja pendiente
    expect(first.memberConnectorX).toBe(7)
    expect(second.memberConnectorX).toBe(0)
    // Las alturas se escalonan para que las líneas de cada pareja no se solapen
    expect(first.coupleHeight).toBeLessThan(second.coupleHeight)
    expect(first.childrenHeight).toBeGreaterThan(second.childrenHeight)
    // Con varios hijos la horizontal abarca del más a la izquierda al más a la derecha
    expect(first.coupleChildrenHorizontalLine).toEqual({ start: 50, end: 250 })
  })
})
