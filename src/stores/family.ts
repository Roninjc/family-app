import type { FamilyData } from '../lib/types/familyTypes'

export const familyData: FamilyData = {
  members: [
    {
      id: '3',
      name: 'Jesús María',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Aguado',
      parents: ['1', '2'],
      children: ['5', '8', '9', '10'],
      siblings: ['4'],
      partner: ['7'],
      previousPartners: ['6']
    },
    {
      id: '1',
      name: 'Dionisio',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Fernandez',
      parents: [],
      children: [],
      siblings: [],
      partner: ['2'],
      previousPartners: []
    },
    {
      id: '2',
      name: 'María',
      firstFamilyName: 'Aguado',
      secondFamilyName: 'Fernandez',
      parents: [],
      children: [],
      siblings: [],
      partner: ['1'],
      previousPartners: []
    },
    {
      id: '6',
      name: 'Luisa',
      firstFamilyName: 'Candela',
      secondFamilyName: 'Martos',
      parents: [],
      children: ['5', '8', '9', '10'],
      siblings: [],
      partner: [],
      previousPartners: ['3']
    },
    {
      id: '7',
      name: 'María Elena',
      firstFamilyName: 'Costa',
      secondFamilyName: 'Bosch',
      parents: [],
      children: [],
      siblings: [],
      partner: ['3'],
      previousPartners: []
    },
    {
      id: '4',
      name: 'María José',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Aguado',
      parents: ['1', '2'],
      children: [],
      siblings: ['3'],
      partner: [],
      previousPartners: []
    },
    {
      id: '5',
      name: 'Jesús',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['8', '9', '10'],
      partner: [],
      previousPartners: []
    },
    {
      id: '8',
      name: 'Javier',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['5', '9', '10'],
      partner: [],
      previousPartners: []
    },
    {
      id: '9',
      name: 'Eva',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['5', '8', '10'],
      partner: [],
      previousPartners: []
    },
    {
      id: '10',
      name: 'Maribel',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['5', '8', '9'],
      partner: [],
      previousPartners: []
    }
  ]
}
