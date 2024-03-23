
import { atom } from 'recoil'


const localStorageEffect = atomKey => ({ setSelf, onSet }) => {
    const key = `crunchy_${atomKey}`
    const savedValue = window.localStorage.getItem(key)
    if (savedValue != null) {
        setSelf(JSON.parse(savedValue))
    }

    onSet((newValue, _, isReset) => {
        if (isReset) {
            window.localStorage.removeItem(key)
        } else {
            window.localStorage.setItem(key, JSON.stringify(newValue))
        }
    })
}


export const pathState = atom({
    key: 'pathSate',
    default: '/init'
})

export const homeIndexState = atom({
    key: 'homeIndexState',
    default: 0
})

/**
 * @todo quitar?
 */
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

export const homeFeedState = atom({
    key: 'homeFeedState',
    default: [],
    effects: [localStorageEffect('homeFeedState')]
})

export const homeFeedExpirationState = atom({
    key: 'homeFeedExpirationState',
    default: null,
})

export const musicFeedState = atom({
    key: 'musicFeedState',
    default: [],
    effects: [localStorageEffect('musicFeedState')]
})

export const musicFeedExpirationState = atom({
    key: 'musicFeedExpirationState',
    default: null
})

export const selectedContentState = atom({
    key: 'selectedContentState',
    default: null
})

export const homefeedReadyState = atom({
    key: 'homefeedReadyState',
    default: false
})

export const playContentState = atom({
    key: 'playContentState',
    default: null
})

export const contactBtnState = atom({
    key: 'contactBtnState',
    default: false
})

export const categoriesState = atom({
    key: 'categoriesState',
    default: [],
    effects: [localStorageEffect('categoriesState')]
})
