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
      children: ['16', '19'],
      siblings: ['3'],
      partner: ['18'],
      previousPartners: ['17']
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
    },
    {
      id: '11',
      name: 'Maria Amparo',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Aguado',
      parents: ['1', '2'],
      children: ['14', '15'],
      siblings: ['3', '4', '12'],
      partner: ['13'],
      previousPartners: []
    },
    {
      id: '12',
      name: 'Dionisio',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Aguado',
      parents: ['1', '2'],
      children: [],
      siblings: ['3', '4', '11'],
      partner: [],
      previousPartners: []
    },
    {
      id: '13',
      name: 'Lalo',
      firstFamilyName: 'Garcia',
      secondFamilyName: '',
      parents: [],
      children: ['14', '15'],
      siblings: [],
      partner: ['11'],
      previousPartners: []
    },
    {
      id: '14',
      name: 'Lalo',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Garcia',
      parents: ['11', '13'],
      children: [],
      siblings: ['15'],
      partner: [],
      previousPartners: []
    },
    {
      id: '15',
      name: 'Andres',
      firstFamilyName: 'Castaño',
      secondFamilyName: 'Garcia',
      parents: ['13', '11'],
      children: [],
      siblings: ['14'],
      partner: [],
      previousPartners: []
    },
    {
      id: '16',
      name: 'Olalla',
      firstFamilyName: 'Casamayor',
      secondFamilyName: 'Castaño',
      parents: ['4', '17'],
      children: [],
      siblings: ['19'],
      partner: [],
      previousPartners: []
    },
    {
      id: '17',
      name: 'Fernando',
      firstFamilyName: 'Casamayor',
      secondFamilyName: '',
      parents: [],
      children: ['16'],
      siblings: [],
      partner: [],
      previousPartners: ['4']
    },
    {
      id: '18',
      name: 'Juan',
      firstFamilyName: '',
      secondFamilyName: '',
      parents: [],
      children: [],
      siblings: [],
      partner: ['4'],
      previousPartners: []
    },
    {
      id: '19',
      name: 'Ignacio',
      firstFamilyName: 'Castaño',
      secondFamilyName: '',
      parents: ['4'],
      children: [],
      siblings: ['16'],
      partner: [],
      previousPartners: []
    }
  ]
}
