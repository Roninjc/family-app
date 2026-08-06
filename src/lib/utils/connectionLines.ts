// Geometría de las líneas del árbol. Todas las coordenadas son relativas al
// couple-wrapper del miembro (se las da connectionLines.svelte tras medir el
// DOM), así que aquí no hay ninguna suposición sobre tamaños de badge ni gaps.

export interface Point {
  x: number
  y: number
}

// Caja medida de un badge: centro + bordes verticales
export interface MemberBox {
  center: Point
  top: number
  bottom: number
}

// Un SVG posicionado en absoluto dentro del couple-wrapper, con su path en
// coordenadas locales
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

// Altura de la línea horizontal de hijos: punto medio del hueco entre la fila
// de los padres y la de los hijos
export const midGapY = (parentsBottomY: number, childrenTopY: number) =>
  (parentsBottomY + childrenTopY) / 2

// Un badge puede tener varias "salidas" hacia hijos (stubs de exparejas y la
// bajada de progenitor único). Para poder seguir cada línea, se reparten
// simétricamente alrededor del centro del badge: exparejas a la izquierda
// (en orden) y la salida de progenitor único la más a la derecha.
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

// Línea horizontal entre los centros de una pareja (la discontinua de
// expareja usa esta misma spec con otra clase CSS)
export const coupleLineSpec = (memberCenter: Point, partnerCenter: Point): LineSpec =>
  specFromSegments([{ from: memberCenter, to: partnerCenter }])

// Bajada desde junction, línea horizontal (bus) a la altura busY y una bajada
// hasta el centro de cada hijo. junction es el punto medio de la pareja (a la
// altura de su línea) o el centro del progenitor único.
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

// Alturas escalonadas de una ex-familia dentro del hueco entre filas: la
// unión de la pareja baja desde arriba y el bus de sus hijos sube desde
// abajo, con un paso por expareja para que varias no se solapen.
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

// Familia de una expareja, en dos trazos: sólido del miembro hasta sus hijos
// (la filiación no caduca) y discontinuo solo desde la intersección hasta la
// expareja (relación pasada).
export const previousPartnerFamilySpecs = (
  member: MemberBox,
  previousPartner: MemberBox,
  childrenCenters: Point[],
  childrenTopY: number,
  previousPartnerIndex: number,
  amountOfPreviousPartners: number,
  // Separación horizontal de la salida en el badge (ver memberExitOffsets)
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
  // El stub que sube al badge de la expareja se desplaza hacia el lado del
  // miembro: las salidas propias de la expareja hacia sus otros hijos parten
  // de su centro exacto (las dibuja su propio nodo) y se solaparían.
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
