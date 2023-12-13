
import { atom } from 'recoil'

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
    default: []
})

export const homeFeedProcessedState = atom({
    key: 'homeFeedProcessedState',
    default: []
})

export const homeFeedExpirationState = atom({
    key: 'homeFeedExpirationState',
    default: null
})

export const musicFeedState = atom({
    key: 'musicFeedState',
    default: []
})

export const musicFeedProcessedState = atom({
    key: 'musicFeedProcessedState',
    default: []
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
