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

// Coordenadas relativas al couple-wrapper, como las produce el componente
const box = (centerX: number, centerY: number, height = 120): MemberBox => ({
  center: { x: centerX, y: centerY },
  top: centerY - height / 2,
  bottom: centerY + height / 2
})

describe('midGapY', () => {
  it('devuelve el punto medio del hueco entre filas', () => {
    expect(midGapY(120, 190)).toBe(155)
  })
})

describe('coupleLineSpec', () => {
  it('dibuja una horizontal entre los centros, con bounds ajustados', () => {
    const spec = coupleLineSpec({ x: 75, y: 60 }, { x: 245, y: 60 })

    expect(spec.left).toBe(75)
    expect(spec.top).toBe(60)
    expect(spec.width).toBe(170)
    expect(spec.height).toBe(1) // altura mínima, la línea es horizontal
    expect(spec.d).toBe('M0 0 L170 0')
  })

  it('funciona con la pareja a la izquierda (expareja): sin anchos negativos', () => {
    const spec = coupleLineSpec({ x: 75, y: 60 }, { x: -115, y: 60 })

    expect(spec.left).toBe(-115)
    expect(spec.width).toBe(190)
    expect(spec.d).toBe('M190 0 L0 0')
  })
})

describe('childrenLinesSpec', () => {
  it('bajada desde el junction, bus horizontal y bajada a cada hijo', () => {
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
    // Bajada del junction hasta el bus
    expect(spec.d).toContain('M85 0 L85 95')
    // Bus horizontal a la altura del hueco
    expect(spec.d).toContain('M0 95 L170 95')
    // Bajadas hasta el centro de cada hijo
    expect(spec.d).toContain('M0 95 L0 190')
    expect(spec.d).toContain('M170 95 L170 190')
  })

  it('el bus cubre al junction aunque los hijos queden todos a un lado', () => {
    const spec = childrenLinesSpec({ x: 300, y: 60 }, [{ x: 75, y: 250 }], 155)

    // De el hijo más a la izquierda (75) hasta el junction (300)
    expect(spec.left).toBe(75)
    expect(spec.width).toBe(225)
    expect(spec.d).toContain('M0 95 L225 95')
  })
})

describe('previousPartnerHeights', () => {
  it('reparte la unión desde arriba y el bus de hijos desde abajo dentro del hueco', () => {
    // hueco 120→190 (70px), 1 expareja → steps 4
    expect(previousPartnerHeights(120, 190, 0, 1)).toEqual({ coupleY: 137.5, busY: 172.5 })
  })

  it('escalona varias exparejas sin que se solapen', () => {
    const first = previousPartnerHeights(120, 190, 0, 2)
    const second = previousPartnerHeights(120, 190, 1, 2)

    expect(first.coupleY).toBeLessThan(second.coupleY)
    expect(first.busY).toBeGreaterThan(second.busY)
    expect(second.coupleY).toBeLessThan(second.busY)
  })

  it('mantiene un hueco mínimo si las filas están muy juntas', () => {
    // gapHeight se fuerza a 24: coupleY = 120 + 24/4 = 126
    expect(previousPartnerHeights(120, 121, 0, 1).coupleY).toBe(126)
  })
})

describe('previousPartnerFamilySpecs', () => {
  const member = box(75, 60)
  const previousPartner = box(-115, 60)
  const children = [{ x: -20, y: 250 }]

  it('trazo sólido continuo desde el miembro hasta los hijos', () => {
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

    // Stub del miembro (75 - 6 = 69) hasta la altura de la unión (137.5)
    expect(memberToChildren.d).toContain(
      `M${local(69)} ${localY(120)} L${local(69)} ${localY(137.5)}`
    )
    // Horizontal hasta la intersección (punto medio, -20) y bajada al bus
    expect(memberToChildren.d).toContain(
      `M${local(69)} ${localY(137.5)} L${local(-20)} ${localY(137.5)}`
    )
    expect(memberToChildren.d).toContain(
      `M${local(-20)} ${localY(137.5)} L${local(-20)} ${localY(172.5)}`
    )
    // Bajada hasta el centro del hijo
    expect(memberToChildren.d).toContain(
      `M${local(-20)} ${localY(172.5)} L${local(-20)} ${localY(250)}`
    )
  })

  it('trazo discontinuo solo desde la intersección hasta la expareja', () => {
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

    // Horizontal intersección→expareja y stub subiendo a su badge, nada más.
    // El stub queda 10px desplazado hacia el miembro (-115 + 10 = -105) para
    // no solaparse con las salidas propias de la expareja hacia otros hijos.
    expect(toPreviousPartner.d).toBe(
      `M${local(-20)} ${localY(137.5)} L${local(-105)} ${localY(137.5)} ` +
        `M${local(-105)} ${localY(137.5)} L${local(-105)} ${localY(120)}`
    )
  })
})

describe('memberExitOffsets', () => {
  it('una sola salida queda centrada en el badge', () => {
    expect(memberExitOffsets(1, false).previousPartnerOffsets).toEqual([0])
    expect(memberExitOffsets(0, true).singleParentOffset).toBe(0)
  })

  it('expareja con hijos + progenitor único: las salidas se separan alrededor del centro', () => {
    const { previousPartnerOffsets, singleParentOffset } = memberExitOffsets(1, true)

    expect(previousPartnerOffsets).toEqual([-6])
    expect(singleParentOffset).toBe(6)
  })

  it('varias exparejas se reparten en orden, con el progenitor único a la derecha', () => {
    const { previousPartnerOffsets, singleParentOffset } = memberExitOffsets(2, true)

    expect(previousPartnerOffsets).toEqual([-12, 0])
    expect(singleParentOffset).toBe(12)
  })
})
