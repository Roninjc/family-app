// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mockFamilyData } from '$lib/data/mockFamily'
import { initTreeData, renderRoots, stack, visitedMembers } from '../../../src/stores/tree'
import TreeNode from '../../../src/components/treeNode.svelte'

// The mock family backs `yarn dev:mock` and doubles as a kitchen-sink layout
// fixture, so it must stay coherent: bidirectional links and full coverage.
describe('mockFamilyData', () => {
  it('keeps every relation bidirectional', () => {
    const byId = new Map(mockFamilyData.members.map((m) => [m.id, m]))

    for (const m of mockFamilyData.members) {
      for (const childId of m.children) {
        expect(byId.get(childId)?.parents, `${m.id} -> ${childId}`).toContain(m.id)
      }
      for (const parentId of m.parents) {
        expect(byId.get(parentId)?.children, `${m.id} -> ${parentId}`).toContain(m.id)
      }
      for (const partnerId of m.partner) {
        expect(byId.get(partnerId)?.partner, `${m.id} -> ${partnerId}`).toContain(m.id)
      }
      for (const exId of m.previousPartners) {
        expect(byId.get(exId)?.previousPartners, `${m.id} -> ${exId}`).toContain(m.id)
      }
      for (const siblingId of m.siblings) {
        expect(byId.get(siblingId)?.siblings, `${m.id} -> ${siblingId}`).toContain(m.id)
      }
    }
  })

  it('renders every member exactly once across all root trees', () => {
    initTreeData(mockFamilyData)
    visitedMembers.set([])
    stack.set([...renderRoots])

    document.body.innerHTML = ''
    for (const rootMemberId of renderRoots) {
      new TreeNode({ target: document.body, props: { memberId: rootMemberId } })
    }

    for (const m of mockFamilyData.members) {
      expect(document.querySelectorAll(`[id="${m.id}"]`), m.id).toHaveLength(1)
    }
  })
})
