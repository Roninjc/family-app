// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'
import { firstGeneration, initTreeData, stack, visitedMembers } from '../stores/tree'
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

// Reproduce lo que hace +page.svelte antes de montar el árbol
const mountTree = (members: FamilyMember[]) => {
  const familyData: FamilyData = { members }
  initTreeData(familyData)
  visitedMembers.set([])
  const initialMemberId = firstGeneration?.[0]?.nodeId
  stack.set(initialMemberId ? [initialMemberId] : [])

  document.body.innerHTML = ''
  return new TreeNode({ target: document.body, props: { memberId: initialMemberId! } })
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
})
