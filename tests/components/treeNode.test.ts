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

// Reproduces what +page.svelte does: one TreeNode per render root
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
  it('renders a couple with children and their lines', async () => {
    mountTree([
      member('father', { partner: ['mother'], children: ['child1', 'child2'] }),
      member('mother', { children: ['child1', 'child2'] }),
      member('child1'),
      member('child2')
    ])

    await tick()

    for (const id of ['father', 'mother', 'child1', 'child2']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
    expect(document.querySelector('svg.couple-line')).toBeTruthy()
    expect(document.querySelector('svg.couple-children-lines')).toBeTruthy()
  })

  it('renders a single parent with children without crashing', () => {
    mountTree([
      member('mother', { children: ['child1', 'child2'] }),
      member('child1'),
      member('child2')
    ])

    for (const id of ['mother', 'child1', 'child2']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
  })

  it('renders a widowed/divorced member with a previous partner and children but no current partner', () => {
    mountTree([
      member('father', { previousPartners: ['ex'], children: ['child'] }),
      member('ex', { children: ['child'] }),
      member('child')
    ])

    for (const id of ['father', 'ex', 'child']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
  })

  it("renders an in-law's parents as an extra root, without duplicating anyone", () => {
    mountTree([
      member('grandpa', { partner: ['grandma'], children: ['father'] }),
      member('grandma', { children: ['father'] }),
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'], parents: ['fatherinlaw', 'motherinlaw'] }),
      member('fatherinlaw', { partner: ['motherinlaw'], children: ['aunt'] }),
      member('motherinlaw', { children: ['aunt'] }),
      member('aunt'),
      member('child')
    ])

    // Everyone visible, including the in-law's parents and the aunt that only
    // hangs from them
    for (const id of [
      'grandpa',
      'grandma',
      'father',
      'mother',
      'fatherinlaw',
      'motherinlaw',
      'aunt',
      'child'
    ]) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
    // mother renders only once (in the main tree, as a partner)
    expect(document.querySelectorAll('[id="mother"]')).toHaveLength(1)
  })

  it('draws a dashed line to a previous partner with no common children', async () => {
    mountTree([
      member('father', { previousPartners: ['ex'], partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('ex'),
      member('child')
    ])

    await tick()

    for (const id of ['father', 'mother', 'ex', 'child']) {
      expect(document.getElementById(id), id).toBeTruthy()
    }
    expect(document.querySelector('svg.no-children-previous-couple-svg')).toBeTruthy()
  })

  it('separates the exits when a previous partner with children and a single-parent group coexist', async () => {
    mountTree([
      member('mariajose', { previousPartners: ['ignacio'], children: ['exchild', 'olalla'] }),
      member('ignacio', { children: ['exchild'] }),
      member('exchild'),
      member('olalla')
    ])

    await tick()

    // Member-to-children stroke is solid; dashed only towards the previous partner
    expect(document.querySelector('svg.previous-couple-family-lines')).toBeTruthy()
    expect(document.querySelector('svg.previous-couple-join')).toBeTruthy()
    const singleParentPath = document
      .querySelector('svg.single-parent-lines path')
      ?.getAttribute('d')
    // In jsdom every rect measures 0, so the exit offset (+6) is the only
    // thing shifting the single-parent drop
    expect(singleParentPath).toContain('M6 0')
  })

  it("groups children by family in the row (the previous partner's children on the left)", async () => {
    mountTree([
      member('father', {
        partner: ['mother'],
        previousPartners: ['ex'],
        children: ['currentchild', 'exchild']
      }),
      member('mother', { children: ['currentchild'] }),
      member('ex', { children: ['exchild'] }),
      member('currentchild'),
      member('exchild')
    ])

    await tick()

    const exChild = document.getElementById('exchild')
    const currentChild = document.getElementById('currentchild')
    expect(exChild).toBeTruthy()
    expect(currentChild).toBeTruthy()
    // Even though currentchild comes first in the data, in the DOM the
    // previous partner's child is placed before (on the left, next to the ex)
    expect(
      exChild!.compareDocumentPosition(currentChild!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('generation bands: children exclusive to a previous partner share the row with the other children', async () => {
    // Maribel case: daughter of Luisa only (JM's previous partner); Javier and Eva children of both
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

    // Luisa (previous partner) shares the badges row with JM and Elena
    expect(document.getElementById('luisa')?.parentElement).toBe(
      document.getElementById('jm')?.parentElement
    )
    // Maribel shares the children row with her siblings, even though she is
    // only recorded as Luisa's daughter (she used to land one band below)
    expect(document.getElementById('maribel')?.closest('.children-wrapper')).toBe(
      document.getElementById('javier')?.closest('.children-wrapper')
    )
    // And there are lines for both the ex-family and the single parent
    expect(document.querySelector('svg.previous-couple-family-lines')).toBeTruthy()
    expect(document.querySelector('svg.single-parent-lines')).toBeTruthy()
  })

  it("clicking a member's badge opens the edit modal with their id", () => {
    showEditMemberModal.set(false)
    editingMemberId.set(null)

    mountTree([
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('child')
    ])

    const badgeButton = document.getElementById('mother')?.querySelector('button')
    expect(badgeButton).toBeTruthy()
    badgeButton?.click()

    expect(get(showEditMemberModal)).toBe(true)
    expect(get(editingMemberId)).toBe('mother')
  })
})
