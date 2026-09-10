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

// Siblings with no parents in the tree (adjacent badges, no connecting line).
// Tomás continues into a separate 7-generation lineage below, to exercise
// the tree intro animation with a deep family.
const tomas = member('tomas', 'Tomás', 'Roble')
const ursula = member('ursula', 'Úrsula', 'Roble')
// Disconnected member (renders as its own root)
const zacarias = member('zacarias', 'Zacarías', 'Aislado')

// Organic branching lineage (generations 1-7) hanging off Tomás, to preview
// the cinematic intro on a real-looking tree: family sizes vary per couple,
// several branches end early (no partner/children) while only one line
// keeps going all the way down, and generation widths grow and shrink
// irregularly instead of a single path or a single symmetric bulge.
const mariana = member('mariana', 'Mariana', 'Roble')
const pedro = member('pedro', 'Pedro', 'Roble')
const isabel = member('isabel', 'Isabel', 'Roble')
const rodrigo = member('rodrigo', 'Rodrigo', 'Roble')

const carmen = member('carmen', 'Carmen', 'Roble')
const fernando = member('fernando', 'Fernando', 'Roble')
const sofia = member('sofia', 'Sofía', 'Roble')
const ismael = member('ismael', 'Ismael', 'Roble')
const alba = member('alba', 'Alba', 'Roble')
const nico = member('nico', 'Nico', 'Roble')
const paula = member('paula', 'Paula', 'Roble')
const hugo = member('hugo', 'Hugo', 'Roble')

const diego = member('diego', 'Diego', 'Roble')
const elena = member('elena', 'Elena', 'Roble')
const vera = member('vera', 'Vera', 'Roble')
const mateo = member('mateo', 'Mateo', 'Roble')
const claudia = member('claudia', 'Claudia', 'Roble')
const bruno = member('bruno', 'Bruno', 'Roble')
const iker = member('iker', 'Iker', 'Roble')
const lucas = member('lucas', 'Lucas', 'Roble')

const carla = member('carla', 'Carla', 'Roble')
const noelia = member('noelia', 'Noelia', 'Roble')
const valentina = member('valentina', 'Valentina', 'Roble')
const marta = member('marta', 'Marta', 'Roble')
const leon = member('leon', 'León', 'Roble')

const adrian = member('adrian', 'Adrián', 'Roble')
const noa = member('noa', 'Noa', 'Roble')
const aitana = member('aitana', 'Aitana', 'Roble')
const julia = member('julia', 'Julia', 'Roble')
const martina = member('martina', 'Martina', 'Roble')

const mario = member('mario', 'Mario', 'Roble')
const nora = member('nora', 'Nora', 'Roble')

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

// Tomás's organic branching lineage: family sizes vary per couple, several
// branches end early, and only one line (Tomás -> Pedro -> Sofía -> Mateo
// -> Valentina -> Julia -> Nora) reaches generation 7.
linkPartner(tomas, mariana)
for (const child of [pedro, isabel, rodrigo]) {
  linkParent(tomas, child)
  linkParent(mariana, child)
}

linkPartner(pedro, carmen)
for (const child of [sofia, ismael, alba]) {
  linkParent(pedro, child)
  linkParent(carmen, child)
}

linkPartner(isabel, fernando)
for (const child of [nico, paula]) {
  linkParent(isabel, child)
  linkParent(fernando, child)
}

// Rodrigo: single parent, no partner in the tree.
linkParent(rodrigo, hugo)

linkPartner(sofia, diego)
for (const child of [mateo, claudia]) {
  linkParent(sofia, child)
  linkParent(diego, child)
}

linkPartner(ismael, elena)
linkParent(ismael, bruno)
linkParent(elena, bruno)

// Alba, Paula and Hugo: no partner/children in the tree - branches that end
// early, alongside the ones that keep going.

linkPartner(nico, vera)
for (const child of [iker, lucas]) {
  linkParent(nico, child)
  linkParent(vera, child)
}

linkPartner(mateo, carla)
for (const child of [valentina, marta]) {
  linkParent(mateo, child)
  linkParent(carla, child)
}

linkPartner(bruno, noelia)
linkParent(bruno, leon)
linkParent(noelia, leon)

// Claudia, Iker and Lucas: no partner/children in the tree.

linkPartner(valentina, adrian)
for (const child of [aitana, julia]) {
  linkParent(valentina, child)
  linkParent(adrian, child)
}

linkPartner(leon, noa)
linkParent(leon, martina)
linkParent(noa, martina)

// Marta, Aitana and Martina: no partner/children in the tree.

linkPartner(julia, mario)
linkParent(julia, nora)
linkParent(mario, nora)

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
    zacarias,
    mariana,
    pedro,
    isabel,
    rodrigo,
    carmen,
    fernando,
    sofia,
    ismael,
    alba,
    nico,
    paula,
    hugo,
    diego,
    elena,
    vera,
    mateo,
    claudia,
    bruno,
    iker,
    lucas,
    carla,
    noelia,
    valentina,
    marta,
    leon,
    adrian,
    noa,
    aitana,
    julia,
    martina,
    mario,
    nora
  ]
}
