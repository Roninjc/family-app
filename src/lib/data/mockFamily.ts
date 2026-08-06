import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'

// Demo family used by `yarn dev:mock` (no Supabase involved) and by smoke
// tests. It deliberately covers every layout case the tree engine handles:
// multiple generations, a couple with children, a previous partner with
// common children plus an exclusive child, two previous partners (line
// staggering), a previous partner with no common children (dashed line), a
// single parent, in-law parents (extra root tree), siblings with no parents
// in the tree, and a disconnected member.

const member = (id: string, name: string, familyName: string): FamilyMember => ({
  id,
  name,
  familyName,
  parents: [],
  children: [],
  siblings: [],
  partner: [],
  previousPartners: []
})

// Links are always written in both directions, matching what
// rowsToFamilyData produces (the modals and suggestion helpers rely on it)
const linkParent = (parent: FamilyMember, child: FamilyMember) => {
  parent.children.push(child.id)
  child.parents.push(parent.id)
}
const linkPartner = (a: FamilyMember, b: FamilyMember) => {
  a.partner.push(b.id)
  b.partner.push(a.id)
}
const linkPreviousPartner = (a: FamilyMember, b: FamilyMember) => {
  a.previousPartners.push(b.id)
  b.previousPartners.push(a.id)
}
const linkSiblings = (a: FamilyMember, b: FamilyMember) => {
  a.siblings.push(b.id)
  b.siblings.push(a.id)
}

// Generation 1
const aurelio = member('aurelio', 'Aurelio', 'Demo Rama')
const benita = member('benita', 'Benita', 'Flores')
// Generation 1, in-laws (only reachable as an extra root tree)
const cosme = member('cosme', 'Cosme', 'Sauce')
const delia = member('delia', 'Delia', 'Olmo')

// Generation 2
const ernesto = member('ernesto', 'Ernesto', 'Demo Flores')
const fatima = member('fatima', 'Fátima', 'Demo Flores')
const gonzalo = member('gonzalo', 'Gonzalo', 'Demo Flores')
const irene = member('irene', 'Irene', 'Sauce Olmo')
const hector = member('hector', 'Héctor', 'Pino')
const samuel = member('samuel', 'Samuel', 'Abeto')
const ivan = member('ivan', 'Iván', 'Cedro')
const rosa = member('rosa', 'Rosa', 'Encina')

// Generation 3
const lucia = member('lucia', 'Lucía', 'Demo Sauce')
const marcos = member('marcos', 'Marcos', 'Demo Sauce')
const nuria = member('nuria', 'Nuria', 'Pino Demo')
const olga = member('olga', 'Olga', 'Pino')
const teresa = member('teresa', 'Teresa', 'Abeto Demo')
const pablo = member('pablo', 'Pablo', 'Cedro Demo')
const quique = member('quique', 'Quique', 'Demo')

// Siblings with no parents in the tree (adjacent badges, no connecting line)
const tomas = member('tomas', 'Tomás', 'Roble')
const ursula = member('ursula', 'Úrsula', 'Roble')
// Disconnected member (renders as its own root)
const zacarias = member('zacarias', 'Zacarías', 'Aislado')

// Main couple and their children
linkPartner(aurelio, benita)
for (const child of [ernesto, fatima, gonzalo]) {
  linkParent(aurelio, child)
  linkParent(benita, child)
}

// Ernesto + Irene (whose parents are an in-law root tree)
linkPartner(ernesto, irene)
linkParent(cosme, irene)
linkParent(delia, irene)
linkPartner(cosme, delia)
for (const child of [lucia, marcos]) {
  linkParent(ernesto, child)
  linkParent(irene, child)
}

// Fátima: two previous partners with children, plus current partner.
// Héctor also has an exclusive child (Olga), the "Maribel" layout case.
linkPreviousPartner(fatima, hector)
linkParent(fatima, nuria)
linkParent(hector, nuria)
linkParent(hector, olga)
linkPreviousPartner(fatima, samuel)
linkParent(fatima, teresa)
linkParent(samuel, teresa)
linkPartner(fatima, ivan)
linkParent(fatima, pablo)
linkParent(ivan, pablo)

// Gonzalo: single parent, and a previous partner with no common children
linkParent(gonzalo, quique)
linkPreviousPartner(gonzalo, rosa)

linkSiblings(tomas, ursula)

export const mockFamilyData: FamilyData = {
  members: [
    aurelio,
    benita,
    cosme,
    delia,
    ernesto,
    fatima,
    gonzalo,
    irene,
    hector,
    samuel,
    ivan,
    rosa,
    lucia,
    marcos,
    nuria,
    olga,
    teresa,
    pablo,
    quique,
    tomas,
    ursula,
    zacarias
  ]
}
