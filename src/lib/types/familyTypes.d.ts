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

export interface FamilyNode extends FamilyMember {
  getParents(): string[]
  getChildren(): string[]
  getSiblings(): string[]
  getPartner(): string[]
  getPreviousPartners(): string[]
}

export interface FamilyData {
  members: FamilyMember[]
}
