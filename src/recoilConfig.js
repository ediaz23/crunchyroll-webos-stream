
import { atom } from 'recoil'

export const homeIndexState = atom({
    key: 'homeIndexState',
    default: 0
})

export const searchState = atom({
    key: 'searchState',
    default: ''
})
