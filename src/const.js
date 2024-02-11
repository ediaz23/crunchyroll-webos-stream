
/** @type {Boolean} */
export const LOAD_MOCK_DATA = __DEV__ && false

/** @type {Boolean} */
export const DEV_FAST_SELECT = __DEV__ && false

/** @type {Boolean} */
export const _PLAY_TEST_ = __DEV__ && false

/** @type {'dash' | 'hls' | 'none'} */
export const _PLAYER_TYPE_ = 'dash'

// posible values series
/** @type {String} */
export const DEV_CONTENT_TYPE = null
//export const DEV_CONTENT_TYPE = 'episode'
//export const DEV_CONTENT_TYPE = 'series'
//export const DEV_CONTENT_TYPE = 'musicArtist'
//export const DEV_CONTENT_TYPE = 'musicConcert'


export const ERROR_CODES = {
    invalid_email_password: 'auth.obtain_access_token.force_password_reset',
    invalid_password: 'auth.obtain_access_token.invalid_credentials',
    invalid_refresh_token: 'auth.obtain_access_token.oauth2_error',
    invalid_auth_token: 'accounts.get_profile.invalid_auth_token',
}

export default {}
