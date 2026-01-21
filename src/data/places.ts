export type Place = {
  id: string
  title: string
  date: string
  lat: number
  lng: number
}

export const PLACES: Place[] = [
  {
    id: 'kostroma-1995-12-25',
    title: 'Kostroma',
    date: '1995-12-25',
    lat: 57.767918,
    lng: 40.926894,
  },
  {
    id: 'norilsk-1996-03-01',
    title: 'Norilsk',
    date: '1996-03-01',
    lat: 69.343985,
    lng: 88.210393,
  },
  {
    id: 'krasnoyarsk-2002-06-01',
    title: 'Krasnoyarsk',
    date: '2002-06-01',
    lat: 56.05873,
    lng: 92.927707,
  },
  {
    id: 'chekhov-2011-07-01',
    title: 'Chekhov',
    date: '2011-07-01',
    lat: 55.149048,
    lng: 37.458867,
  },
  {
    id: 'kotelniki-2023-08-01',
    title: 'Kotelniki',
    date: '2023-08-01',
    lat: 55.672895,
    lng: 37.857602,
  },
]
