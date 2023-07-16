
/** @type {Boolean} */
export const LOAD_MOCK_DATA = __DEV__ && true

/** @type {Boolean} */
export const DEV_FAST_SELECT = __DEV__ && true

// posible values series
/** @type {String} */
export const DEV_CONTENT_TYPE = 'series'

export const ERROR_CODES = {
    invalid_email_password: 'auth.obtain_access_token.force_password_reset',
    invalid_password: 'auth.obtain_access_token.invalid_credentials',
    invalid_refresh_token: 'auth.obtain_access_token.oauth2_error',
    invalid_auth_token: 'accounts.get_profile.invalid_auth_token',
}

export default {}
