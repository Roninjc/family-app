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
  weight: number
}

export interface Couple {
  nodeId: string
  coupleNodeId: string
  children: Relationship[]
}
