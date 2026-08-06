// @vitest-environment jsdom
import { tick } from 'svelte'
import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'
import { editingMemberId, showEditMemberModal } from '../../src/stores/modals'
import { initTreeData, renderRoots, stack, visitedMembers } from '../../src/stores/tree'
import TreeNode from '../../src/components/treeNode.svelte'

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

// Reproduce lo que hace +page.svelte: un TreeNode por raíz de renderizado
const mountTree = (members: FamilyMember[]) => {
  const familyData: FamilyData = { members }
  initTreeData(familyData)
  visitedMembers.set([])
  stack.set([...renderRoots])

  document.body.innerHTML = ''
  for (const rootMemberId of renderRoots) {
    new TreeNode({ target: document.body, props: { memberId: rootMemberId } })
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('treeNode', () => {
  it('renderiza una pareja con hijos y sus líneas', async () => {
    mountTree([
      member('padre', { partner: ['madre'], children: ['hijo1', 'hijo2'] }),
      member('madre', { children: ['hijo1', 'hijo2'] }),
      member('hijo1'),
      member('hijo2')
    ])

    await tick()

    for (const id of ['padre', 'madre', 'hijo1', 'hijo2']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
    expect(document.querySelector('svg.couple-line')).toBeTruthy()
    expect(document.querySelector('svg.couple-children-lines')).toBeTruthy()
  })

  it('renderiza un progenitor único con hijos sin crashear', () => {
    mountTree([member('madre', { children: ['hijo1', 'hijo2'] }), member('hijo1'), member('hijo2')])

    for (const id of ['madre', 'hijo1', 'hijo2']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
  })

  it('renderiza a un viudo/divorciado con expareja e hijos pero sin pareja actual', () => {
    mountTree([
      member('padre', { previousPartners: ['ex'], children: ['hijo'] }),
      member('ex', { children: ['hijo'] }),
      member('hijo')
    ])

    for (const id of ['padre', 'ex', 'hijo']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
  })

  it('renderiza a los padres de un consorte como raíz extra, sin duplicar a nadie', () => {
    mountTree([
      member('abuelo', { partner: ['abuela'], children: ['padre'] }),
      member('abuela', { children: ['padre'] }),
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'], parents: ['suegro', 'suegra'] }),
      member('suegro', { partner: ['suegra'], children: ['tia'] }),
      member('suegra', { children: ['tia'] }),
      member('tia'),
      member('hijo')
    ])

    // Todos visibles, incluidos los padres del consorte y la tía que solo
    // cuelga de ellos
    for (const id of ['abuelo', 'abuela', 'padre', 'madre', 'suegro', 'suegra', 'tia', 'hijo']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
    // madre solo se renderiza una vez (en el árbol principal, como pareja)
    expect(document.querySelectorAll('[id="madre"]')).toHaveLength(1)
  })

  it('dibuja una línea discontinua hacia una expareja sin hijos comunes', async () => {
    mountTree([
      member('padre', { previousPartners: ['ex'], partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('ex'),
      member('hijo')
    ])

    await tick()

    for (const id of ['padre', 'madre', 'ex', 'hijo']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
    expect(document.querySelector('svg.no-children-previous-couple-svg')).toBeTruthy()
  })

  it('separa las salidas cuando conviven expareja con hijos y progenitor único', async () => {
    mountTree([
      member('mariajose', { previousPartners: ['ignacio'], children: ['hijoex', 'olalla'] }),
      member('ignacio', { children: ['hijoex'] }),
      member('hijoex'),
      member('olalla')
    ])

    await tick()

    // Del miembro a los hijos sólido; discontinuo solo hacia la expareja
    expect(document.querySelector('svg.previous-couple-family-lines')).toBeTruthy()
    expect(document.querySelector('svg.previous-couple-join')).toBeTruthy()
    const singleParentPath = document
      .querySelector('svg.single-parent-lines path')
      ?.getAttribute('d')
    // En jsdom todos los rects miden 0, así que el offset de salida (+6) es
    // lo único que desplaza la bajada de progenitor único
    expect(singleParentPath).toContain('M6 0')
  })

  it('agrupa a los hijos por familia en la fila (los de la expareja a la izquierda)', async () => {
    mountTree([
      member('padre', {
        partner: ['madre'],
        previousPartners: ['ex'],
        children: ['hijoactual', 'hijoex']
      }),
      member('madre', { children: ['hijoactual'] }),
      member('ex', { children: ['hijoex'] }),
      member('hijoactual'),
      member('hijoex')
    ])

    await tick()

    const hijoEx = document.getElementById('hijoex')
    const hijoActual = document.getElementById('hijoactual')
    expect(hijoEx).toBeTruthy()
    expect(hijoActual).toBeTruthy()
    // Aunque en los datos hijoactual va primero, en el DOM el hijo de la
    // expareja se coloca antes (a la izquierda, junto a la ex)
    expect(
      hijoEx!.compareDocumentPosition(hijoActual!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('bandas por generación: los hijos exclusivos de una expareja comparten fila con los demás hijos', async () => {
    // Caso Maribel: hija solo de Luisa (expareja de JM); Javier y Eva hijos de ambos
    mountTree([
      member('jm', {
        partner: ['elena'],
        previousPartners: ['luisa'],
        children: ['javier', 'eva']
      }),
      member('luisa', { children: ['javier', 'eva', 'maribel'] }),
      member('elena'),
      member('maribel'),
      member('javier'),
      member('eva')
    ])

    await tick()

    // Luisa (expareja) comparte la fila de badges con JM y Elena
    expect(document.getElementById('luisa')?.parentElement).toBe(
      document.getElementById('jm')?.parentElement
    )
    // Maribel comparte la fila de hijos con sus hermanos, aunque solo conste
    // como hija de Luisa (antes caía una banda por debajo)
    expect(document.getElementById('maribel')?.closest('.children-wrapper')).toBe(
      document.getElementById('javier')?.closest('.children-wrapper')
    )
    // Y hay líneas tanto de la ex-familia como de progenitor único
    expect(document.querySelector('svg.previous-couple-family-lines')).toBeTruthy()
    expect(document.querySelector('svg.single-parent-lines')).toBeTruthy()
  })

  it('pulsar el badge de un miembro abre el modal de edición con su id', () => {
    showEditMemberModal.set(false)
    editingMemberId.set(null)

    mountTree([
      member('padre', { partner: ['madre'], children: ['hijo'] }),
      member('madre', { children: ['hijo'] }),
      member('hijo')
    ])

    const badgeButton = document.getElementById('madre')?.querySelector('button')
    expect(badgeButton).toBeTruthy()
    badgeButton?.click()

    expect(get(showEditMemberModal)).toBe(true)
    expect(get(editingMemberId)).toBe('madre')
  })
})
