import type { FamilyData } from '../lib/types/familyTypes'

export const familyData: FamilyData = {
  members: [
    {
      id: '3',
      name: 'Jesús María',
      familyName: 'Castaño Aguado',
      parents: ['1', '2'],
      children: ['5', '8', '9', '10'],
      siblings: ['4'],
      partner: ['7'],
      previousPartners: ['6']
    },
    {
      id: '1',
      name: 'Dionisio',
      familyName: 'Castaño Fernandez',
      parents: [],
      children: [],
      siblings: [],
      partner: ['2'],
      previousPartners: []
    },
    {
      id: '2',
      name: 'María',
      familyName: 'Aguado',
      parents: [],
      children: [],
      siblings: [],
      partner: ['1'],
      previousPartners: []
    },
    {
      id: '6',
      name: 'Luisa',
      familyName: 'Candela Martos',
      parents: [],
      children: ['5', '8', '9', '10'],
      siblings: [],
      partner: [],
      previousPartners: ['3']
    },
    {
      id: '7',
      name: 'María Elena',
      familyName: 'Costa Jurado',
      parents: [],
      children: [],
      siblings: [],
      partner: ['3'],
      previousPartners: []
    },
    {
      id: '4',
      name: 'María José',
      familyName: 'Castaño Aguado',
      parents: ['1', '2'],
      children: ['16', '19'],
      siblings: ['3'],
      partner: ['18'],
      previousPartners: ['17', '25']
    },
    {
      id: '5',
      name: 'Jesús',
      familyName: 'Castaño Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['8', '9', '10'],
      partner: ['26'],
      previousPartners: []
    },
    {
      id: '8',
      name: 'Javier',
      familyName: 'Castaño Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['5', '9', '10'],
      partner: [],
      previousPartners: []
    },
    {
      id: '9',
      name: 'Eva',
      familyName: 'Castaño Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['5', '8', '10'],
      partner: [],
      previousPartners: []
    },
    {
      id: '10',
      name: 'Maribel',
      familyName: 'Castaño Candela',
      parents: ['3', '6'],
      children: [],
      siblings: ['5', '8', '9'],
      partner: [],
      previousPartners: []
    },
    {
      id: '11',
      name: 'Maria Amparo',
      familyName: 'Castaño Aguado',
      parents: ['1', '2'],
      children: ['14', '15'],
      siblings: ['3', '4', '12'],
      partner: ['13'],
      previousPartners: []
    },
    {
      id: '12',
      name: 'Dionisio',
      familyName: 'Castaño Aguado',
      parents: ['1', '2'],
      children: ['21', '22', '23', '24'],
      siblings: ['3', '4', '11'],
      partner: ['20'],
      previousPartners: []
    },
    {
      id: '13',
      name: 'Lalo',
      familyName: 'Garcia',
      parents: [],
      children: ['14', '15'],
      siblings: [],
      partner: ['11'],
      previousPartners: []
    },
    {
      id: '14',
      name: 'Lalo',
      familyName: 'Castaño Garcia',
      parents: ['11', '13'],
      children: [],
      siblings: ['15'],
      partner: [],
      previousPartners: []
    },
    {
      id: '15',
      name: 'Andres',
      familyName: 'Castaño Garcia',
      parents: ['13', '11'],
      children: [],
      siblings: ['14'],
      partner: [],
      previousPartners: []
    },
    {
      id: '16',
      name: 'Olalla',
      familyName: 'Casamayor Castaño',
      parents: ['4', '17'],
      children: [],
      siblings: ['19'],
      partner: [],
      previousPartners: []
    },
    {
      id: '17',
      name: 'Fernando',
      familyName: 'Casamayor',
      parents: [],
      children: ['16'],
      siblings: [],
      partner: [],
      previousPartners: ['4']
    },
    {
      id: '18',
      name: 'Juan',
      familyName: '',
      parents: [],
      children: [],
      siblings: [],
      partner: ['4'],
      previousPartners: []
    },
    {
      id: '19',
      name: 'Ignacio',
      familyName: 'Castaño',
      parents: ['4', '25'],
      children: [],
      siblings: ['16'],
      partner: [],
      previousPartners: []
    },
    {
      id: '20',
      name: 'Elvira',
      familyName: 'Del Castillo',
      parents: [],
      children: ['21', '22', '23', '24'],
      siblings: [],
      partner: ['12'],
      previousPartners: []
    },
    {
      id: '21',
      name: 'Daniel',
      familyName: 'Castaño Del Castillo',
      parents: ['12', '20'],
      children: [],
      siblings: ['22', '23', '24'],
      partner: [],
      previousPartners: []
    },
    {
      id: '22',
      name: 'Alejandro',
      familyName: 'Castaño Del Castillo',
      parents: ['12', '20'],
      children: [],
      siblings: ['21', '23', '24'],
      partner: [],
      previousPartners: []
    },
    {
      id: '23',
      name: 'Carlos',
      familyName: 'Castaño Del Castillo',
      parents: ['12', '20'],
      children: [],
      siblings: ['21', '22', '24'],
      partner: [],
      previousPartners: []
    },
    {
      id: '24',
      name: 'Elvira',
      familyName: 'Castaño Del Castillo',
      parents: ['12', '20'],
      children: [],
      siblings: ['21', '22', '23'],
      partner: [],
      previousPartners: []
    },
    // {
    //   id: '25',
    //   name: 'Ignacio',
    //   familyName: 'Padre',
    //   parents: [],
    //   children: ['19'],
    //   siblings: [],
    //   partner: [],
    //   previousPartners: ['4']
    // },
    {
      id: '26',
      name: 'Cristina',
      familyName: 'Gjelsten',
      parents: [],
      children: [],
      siblings: [],
      partner: ['5'],
      previousPartners: []
    }
  ]
}
