// @vitest-environment jsdom
import { tick } from 'svelte'
import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'
import { editingMemberId, showEditMemberModal } from '../stores/modals'
import { initTreeData, renderRoots, stack, visitedMembers } from '../stores/tree'
import TreeNode from './treeNode.svelte'

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
  it('renderiza una pareja con hijos', () => {
    mountTree([
      member('padre', { partner: ['madre'], children: ['hijo1', 'hijo2'] }),
      member('madre', { children: ['hijo1', 'hijo2'] }),
      member('hijo1'),
      member('hijo2')
    ])

    for (const id of ['padre', 'madre', 'hijo1', 'hijo2']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
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
