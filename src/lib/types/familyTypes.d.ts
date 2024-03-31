export enum Relation {
  Child = 1,
  Parent,
  Sibling,
  Partner,
  PreviousPartner
}

export interface FamilyMember {
  id: string
  name: string
  firstFamilyName: string
  secondFamilyName: string
  parents: string[]
  children: string[]
  siblings: string[]
  partner: string[]
  previousPartners: string[]
}

export interface MemberInfo {
  name: string
  firstFamilyName: string
  secondFamilyName: string
}
export interface FamilyNode {
  relations: Map
  memberInfo: MemberInfo
}

export interface FamilyData {
  members: FamilyMember[]
}

export interface Relationship {
  nodeId: string
  weight: Relation
}

export interface ParentsChildren {
  parent1: string
  parent2?: string
  children: Relationship[]
}

export interface PartnerRealtionInfo {
  partnerCenter: { x: number; y: number } | undefined
  childrenCenter: { x: number; y: number }[]
  svgCoordinates: {
    left: number
    right: number
    top: number
    bottom: number
  }
}
