
import { atom } from 'recoil'

export const pathState = atom({
    key: 'pathSate',
    default: '/init'
})

export const homeIndexState = atom({
    key: 'homeIndexState',
    default: 0
})

export const searchState = atom({
    key: 'searchState',
    default: ''
})

export const initScreenState = atom({
    key: 'initScreenState',
    default: '/init'
})

export const currentProfileState = atom({
    key: 'currentProfileState',
    default: null
})

export const autoLoginState = atom({
    key: 'autoLoginState',
    default: true
})

