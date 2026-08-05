import { describe, expect, it } from 'vitest'
import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'
import * as tree from './tree'

// Los tests construyen familias mínimas con el mismo shape que produce
// rowsToFamilyData (arrays bidireccionales), aunque buildTree solo necesita
// una dirección porque addEdge inserta la inversa automáticamente.
const member = (id: string, partial: Partial<FamilyMember> = {}): FamilyMember => ({
  id,
  name: id,
  familyName: 'Test',
  parents: [],
  children: [],
  siblings: [],
  partner: [],
  previousPartners: [],
  ...partial
})

const build = (members: FamilyMember[]) => {
  const familyData: FamilyData = { members }
  tree.initTreeData(familyData)
}

const generationOf = (id: string) =>
  tree.generations?.find(({ nodeId }) => nodeId === id)?.generation

describe('generations (dfsLevels + normalización)', () => {
  it('asigna generaciones 1..3 en una familia de tres generaciones', () => {
    build([
      member('abuelo', { partner: ['abuela'], children: ['padre'] }),
      member('abuela', { children: ['padre'] }),
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('hijo')
    ])

    expect(generationOf('abuelo')).toBe(1)
    expect(generationOf('abuela')).toBe(1)
    expect(generationOf('padre')).toBe(2)
    expect(generationOf('madre')).toBe(2)
    expect(generationOf('hijo')).toBe(3)
  })

  it('normaliza a 1 aunque el primer miembro insertado sea de una generación intermedia', () => {
    build([
      member('padre', { parents: ['abuelo'], children: ['hijo'] }),
      member('abuelo'),
      member('hijo')
    ])

    expect(generationOf('abuelo')).toBe(1)
    expect(generationOf('padre')).toBe(2)
    expect(generationOf('hijo')).toBe(3)
    expect(tree.firstGeneration?.map(({ nodeId }) => nodeId)).toEqual(['abuelo'])
  })

  it('parejas, exparejas y hermanos quedan en la misma generación', () => {
    build([
      member('ana', {
        partner: ['bruno'],
        previousPartners: ['carlos'],
        siblings: ['diana'],
        parents: ['eva']
      }),
      member('bruno'),
      member('carlos'),
      member('diana'),
      member('eva')
    ])

    expect(generationOf('bruno')).toBe(2)
    expect(generationOf('carlos')).toBe(2)
    expect(generationOf('diana')).toBe(2)
    expect(generationOf('eva')).toBe(1)
  })

  it('los componentes desconectados también reciben generación, normalizada por componente', () => {
    build([
      member('raiz', { children: ['hijo'] }),
      member('hijo'),
      member('aislado'),
      member('otraRaiz', { children: ['otroHijo'] }),
      member('otroHijo')
    ])

    expect(generationOf('aislado')).toBe(1)
    expect(generationOf('otraRaiz')).toBe(1)
    expect(generationOf('otroHijo')).toBe(2)
  })
})

describe('renderRoots (raíces de renderizado)', () => {
  it('una familia conectada hacia abajo produce una única raíz: su ancestro más antiguo', () => {
    build([
      member('abuelo', { partner: ['abuela'], children: ['padre'] }),
      member('abuela', { children: ['padre'] }),
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('hijo')
    ])

    expect(tree.renderRoots).toEqual(['abuelo'])
  })

  it('los padres de un consorte generan una raíz extra (antes desaparecían del árbol)', () => {
    build([
      member('abuelo', { partner: ['abuela'], children: ['padre'] }),
      member('abuela', { children: ['padre'] }),
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'], parents: ['suegro', 'suegra'] }),
      member('suegro', { partner: ['suegra'] }),
      member('suegra'),
      member('hijo')
    ])

    expect(tree.renderRoots).toHaveLength(2)
    expect(tree.renderRoots[0]).toBe('abuelo')
    // La segunda raíz es uno de los suegros; su pareja se renderiza con él
    expect(['suegro', 'suegra']).toContain(tree.renderRoots[1])
  })

  it('la rama con más generaciones de ancestros se renderiza primero', () => {
    build([
      member('bisabuela', { children: ['suegra'] }),
      member('suegra', { children: ['madre'] }),
      member('abuelo', { children: ['padre'] }),
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('hijo')
    ])

    // bisabuela es la única de generación 1; abuelo (generación 2) queda
    // fuera de su alcance descendente y sale como raíz extra.
    expect(tree.renderRoots).toEqual(['bisabuela', 'abuelo'])
  })

  it('un miembro sin relaciones y otros componentes sueltos salen como raíces extra', () => {
    build([
      member('raiz', { children: ['hijo'] }),
      member('hijo'),
      member('aislado'),
      member('otraRaiz', { children: ['otroHijo'] }),
      member('otroHijo')
    ])

    expect(tree.renderRoots).toHaveLength(3)
    expect(tree.renderRoots[0]).toBe('raiz')
    expect(tree.renderRoots).toContain('aislado')
    expect(tree.renderRoots).toContain('otraRaiz')
    expect(tree.renderRoots).not.toContain('otroHijo')
  })
})

describe('getParentsChildren (agrupación pareja + hijos comunes)', () => {
  it('agrupa una pareja actual con sus hijos comunes', () => {
    build([
      member('padre', { partner: ['madre'], children: ['hijo1', 'hijo2'] }),
      member('madre', { children: ['hijo1', 'hijo2'] }),
      member('hijo1'),
      member('hijo2')
    ])

    const couple = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('padre') && [parent1, parent2].includes('madre')
    )

    expect(couple).toBeDefined()
    expect(couple?.children.map(({ nodeId }) => nodeId).sort()).toEqual(['hijo1', 'hijo2'])
    expect(tree.parentsChildrenArray).toHaveLength(1)
  })

  it('agrupa una expareja con sus hijos comunes', () => {
    build([
      member('padre', { previousPartners: ['ex'], partner: ['madre'], children: ['hijoEx'] }),
      member('ex', { children: ['hijoEx'] }),
      member('madre'),
      member('hijoEx')
    ])

    const exCouple = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('padre') && [parent1, parent2].includes('ex')
    )

    expect(exCouple).toBeDefined()
    expect(exCouple?.children.map(({ nodeId }) => nodeId)).toEqual(['hijoEx'])
  })

  it('agrupa a un padre/madre soltero con todos sus hijos en una sola entrada', () => {
    build([member('madre', { children: ['hijo1', 'hijo2'] }), member('hijo1'), member('hijo2')])

    const single = tree.parentsChildrenArray.filter(
      ({ parent1, parent2 }) => parent1 === 'madre' && !parent2
    )

    expect(single).toHaveLength(1)
    expect(single[0].children.map(({ nodeId }) => nodeId).sort()).toEqual(['hijo1', 'hijo2'])
  })

  it('un hijo solo de uno de los miembros de la pareja no entra en el grupo de la pareja', () => {
    build([
      member('padre', { partner: ['madre'], children: ['hijoComun', 'hijastro'] }),
      member('madre', { children: ['hijoComun'] }),
      member('hijoComun'),
      member('hijastro')
    ])

    const couple = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('padre') && [parent1, parent2].includes('madre')
    )
    const single = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) => parent1 === 'padre' && !parent2
    )

    expect(couple?.children.map(({ nodeId }) => nodeId)).toEqual(['hijoComun'])
    // El hijastro solo tiene un progenitor en el árbol, así que cae en la
    // entrada de progenitor único.
    expect(single?.children.map(({ nodeId }) => nodeId)).toEqual(['hijastro'])
  })

  it('LIMITACIÓN ACTUAL: un hijo de dos progenitores que no constan como pareja no entra en ningún grupo', () => {
    build([
      member('padre', { children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('hijo')
    ])

    // No hay arista partner/previous_partner entre padre y madre, y el hijo
    // tiene dos progenitores, así que ni la rama de pareja ni la de progenitor
    // único lo recogen: el hijo se renderiza sin ninguna línea que lo conecte.
    const groupsWithChild = tree.parentsChildrenArray.filter(({ children }) =>
      children.some(({ nodeId }) => nodeId === 'hijo')
    )

    expect(groupsWithChild).toHaveLength(0)
  })

  it('agrupa parejas también en componentes desconectados', () => {
    build([
      member('a', { partner: ['b'], children: ['c'] }),
      member('b', { children: ['c'] }),
      member('c'),
      member('x', { partner: ['y'], children: ['z'] }),
      member('y', { children: ['z'] }),
      member('z')
    ])

    const coupleAB = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) => [parent1, parent2].includes('a') && [parent1, parent2].includes('b')
    )
    const coupleXY = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) => [parent1, parent2].includes('x') && [parent1, parent2].includes('y')
    )

    expect(coupleAB?.children.map(({ nodeId }) => nodeId)).toEqual(['c'])
    expect(coupleXY?.children.map(({ nodeId }) => nodeId)).toEqual(['z'])
  })

  it('no duplica la pareja aunque ambos miembros la recorran', () => {
    build([
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('hijo', { partner: ['nuera'], children: ['nieto'] }),
      member('nuera', { children: ['nieto'] }),
      member('nieto')
    ])

    const couples = tree.parentsChildrenArray.filter(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('padre') && [parent1, parent2].includes('madre')
    )

    expect(couples).toHaveLength(1)
    expect(tree.parentsChildrenArray).toHaveLength(2)
  })
})

describe('familyTree.addEdge', () => {
  it('inserta la arista inversa de Child/Parent automáticamente', () => {
    build([member('padre', { children: ['hijo'] }), member('hijo')])

    const fromParent = tree.familyTree.getNodeRelationships('padre')
    const fromChild = tree.familyTree.getNodeRelationships('hijo')

    expect(fromParent).toEqual([{ nodeId: 'hijo', weight: 1 }]) // Child
    expect(fromChild).toEqual([{ nodeId: 'padre', weight: 2 }]) // Parent
  })
})
