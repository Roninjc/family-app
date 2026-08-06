import { describe, expect, it } from 'vitest'
import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'
import * as tree from '../../src/stores/tree'

// Tests build minimal families with the same shape rowsToFamilyData produces
// (bidirectional arrays), although buildTree only needs one direction because
// addEdge inserts the inverse automatically.
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

describe('generations (dfsLevels + normalization)', () => {
  it('assigns generations 1..3 in a three-generation family', () => {
    build([
      member('grandpa', { partner: ['grandma'], children: ['father'] }),
      member('grandma', { children: ['father'] }),
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('child')
    ])

    expect(generationOf('grandpa')).toBe(1)
    expect(generationOf('grandma')).toBe(1)
    expect(generationOf('father')).toBe(2)
    expect(generationOf('mother')).toBe(2)
    expect(generationOf('child')).toBe(3)
  })

  it('normalizes to 1 even when the first inserted member belongs to a middle generation', () => {
    build([
      member('father', { parents: ['grandpa'], children: ['child'] }),
      member('grandpa'),
      member('child')
    ])

    expect(generationOf('grandpa')).toBe(1)
    expect(generationOf('father')).toBe(2)
    expect(generationOf('child')).toBe(3)
    expect(tree.firstGeneration?.map(({ nodeId }) => nodeId)).toEqual(['grandpa'])
  })

  it('partners, previous partners and siblings land in the same generation', () => {
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

  it('disconnected components also get a generation, normalized per component', () => {
    build([
      member('root', { children: ['child'] }),
      member('child'),
      member('isolated'),
      member('otherRoot', { children: ['otherChild'] }),
      member('otherChild')
    ])

    expect(generationOf('isolated')).toBe(1)
    expect(generationOf('otherRoot')).toBe(1)
    expect(generationOf('otherChild')).toBe(2)
  })
})

describe('renderRoots', () => {
  it('a downward-connected family yields a single root: its oldest ancestor', () => {
    build([
      member('grandpa', { partner: ['grandma'], children: ['father'] }),
      member('grandma', { children: ['father'] }),
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('child')
    ])

    expect(tree.renderRoots).toEqual(['grandpa'])
  })

  it("an in-law's parents produce an extra root (they used to vanish from the tree)", () => {
    build([
      member('grandpa', { partner: ['grandma'], children: ['father'] }),
      member('grandma', { children: ['father'] }),
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'], parents: ['fatherinlaw', 'motherinlaw'] }),
      member('fatherinlaw', { partner: ['motherinlaw'] }),
      member('motherinlaw'),
      member('child')
    ])

    expect(tree.renderRoots).toHaveLength(2)
    expect(tree.renderRoots[0]).toBe('grandpa')
    // The second root is one of the in-law parents; their partner renders with them
    expect(['fatherinlaw', 'motherinlaw']).toContain(tree.renderRoots[1])
  })

  it('the branch with the most ancestor generations renders first', () => {
    build([
      member('greatgrandma', { children: ['motherinlaw'] }),
      member('motherinlaw', { children: ['mother'] }),
      member('grandpa', { children: ['father'] }),
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('child')
    ])

    // greatgrandma is the only member of generation 1; grandpa (generation 2)
    // is out of her descendant reach and comes out as an extra root.
    expect(tree.renderRoots).toEqual(['greatgrandma', 'grandpa'])
  })

  it('a member without relations and other loose components come out as extra roots', () => {
    build([
      member('root', { children: ['child'] }),
      member('child'),
      member('isolated'),
      member('otherRoot', { children: ['otherChild'] }),
      member('otherChild')
    ])

    expect(tree.renderRoots).toHaveLength(3)
    expect(tree.renderRoots[0]).toBe('root')
    expect(tree.renderRoots).toContain('isolated')
    expect(tree.renderRoots).toContain('otherRoot')
    expect(tree.renderRoots).not.toContain('otherChild')
  })
})

describe('getParentsChildren (couple + common children grouping)', () => {
  it('groups a current couple with their common children', () => {
    build([
      member('father', { partner: ['mother'], children: ['child1', 'child2'] }),
      member('mother', { children: ['child1', 'child2'] }),
      member('child1'),
      member('child2')
    ])

    const couple = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('father') && [parent1, parent2].includes('mother')
    )

    expect(couple).toBeDefined()
    expect(couple?.children.map(({ nodeId }) => nodeId).sort()).toEqual(['child1', 'child2'])
    expect(tree.parentsChildrenArray).toHaveLength(1)
  })

  it('groups a previous couple with their common children', () => {
    build([
      member('father', { previousPartners: ['ex'], partner: ['mother'], children: ['exchild'] }),
      member('ex', { children: ['exchild'] }),
      member('mother'),
      member('exchild')
    ])

    const exCouple = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('father') && [parent1, parent2].includes('ex')
    )

    expect(exCouple).toBeDefined()
    expect(exCouple?.children.map(({ nodeId }) => nodeId)).toEqual(['exchild'])
  })

  it('groups a single parent with all their children in a single entry', () => {
    build([
      member('mother', { children: ['child1', 'child2'] }),
      member('child1'),
      member('child2')
    ])

    const single = tree.parentsChildrenArray.filter(
      ({ parent1, parent2 }) => parent1 === 'mother' && !parent2
    )

    expect(single).toHaveLength(1)
    expect(single[0].children.map(({ nodeId }) => nodeId).sort()).toEqual(['child1', 'child2'])
  })

  it("a child of only one member of the couple does not join the couple's group", () => {
    build([
      member('father', { partner: ['mother'], children: ['commonchild', 'stepchild'] }),
      member('mother', { children: ['commonchild'] }),
      member('commonchild'),
      member('stepchild')
    ])

    const couple = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('father') && [parent1, parent2].includes('mother')
    )
    const single = tree.parentsChildrenArray.find(
      ({ parent1, parent2 }) => parent1 === 'father' && !parent2
    )

    expect(couple?.children.map(({ nodeId }) => nodeId)).toEqual(['commonchild'])
    // The stepchild has only one parent in the tree, so it falls into the
    // single-parent entry.
    expect(single?.children.map(({ nodeId }) => nodeId)).toEqual(['stepchild'])
  })

  it('KNOWN LIMITATION: a child of two parents not recorded as a couple joins no group', () => {
    build([
      member('father', { children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('child')
    ])

    // There is no partner/previous_partner edge between father and mother, and
    // the child has two parents, so neither the couple branch nor the
    // single-parent branch picks it up: the child renders with no connecting line.
    const groupsWithChild = tree.parentsChildrenArray.filter(({ children }) =>
      children.some(({ nodeId }) => nodeId === 'child')
    )

    expect(groupsWithChild).toHaveLength(0)
  })

  it('groups couples in disconnected components too', () => {
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

  it('does not duplicate the couple even though both members traverse it', () => {
    build([
      member('father', { partner: ['mother'], children: ['child'] }),
      member('mother', { children: ['child'] }),
      member('child', { partner: ['daughterinlaw'], children: ['grandchild'] }),
      member('daughterinlaw', { children: ['grandchild'] }),
      member('grandchild')
    ])

    const couples = tree.parentsChildrenArray.filter(
      ({ parent1, parent2 }) =>
        [parent1, parent2].includes('father') && [parent1, parent2].includes('mother')
    )

    expect(couples).toHaveLength(1)
    expect(tree.parentsChildrenArray).toHaveLength(2)
  })
})

describe('familyTree.addEdge', () => {
  it('automatically inserts the inverse Child/Parent edge', () => {
    build([member('father', { children: ['child'] }), member('child')])

    const fromParent = tree.familyTree.getNodeRelationships('father')
    const fromChild = tree.familyTree.getNodeRelationships('child')

    expect(fromParent).toEqual([{ nodeId: 'child', weight: 1 }]) // Child
    expect(fromChild).toEqual([{ nodeId: 'father', weight: 2 }]) // Parent
  })
})
