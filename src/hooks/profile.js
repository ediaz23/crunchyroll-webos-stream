
import api from '../api'

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.setProfile
 */
export const useSaveProfile = ({ profile, setProfile }) => {
    return async (newValue) => {
        await api.account.updateProfile(newValue)
        setProfile({ ...profile, ...newValue })
    }
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.setProfile
 * @param {String} obj.field
 */
export const useSaveOneProfileField = ({ profile, setProfile, field }) => {
    const saveProfile = useSaveProfile({ profile, setProfile })
    return async (value) => saveProfile({ [field]: value })
}

export default useSaveProfile
