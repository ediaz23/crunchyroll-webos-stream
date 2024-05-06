
import api from '../api'

/**
 * @param {{
    profile: import('crunchyroll-js-api').Types.Profile,
    setProfile: Function}}
 */
export const useSaveProfile = ({ profile, setProfile }) => {
    return async (newValue) => {
        await api.account.updateProfile(newValue)
        setProfile({ ...profile, ...newValue })
    }
}

/**
 * @param {{
    profile: import('crunchyroll-js-api').Types.Profile,
    setProfile: Function,
    field: String}}
 */
export const useSaveOneProfileField = ({ profile, setProfile, field }) => {
    const saveProfile = useSaveProfile({ profile, setProfile })
    return async (value) => saveProfile({ [field]: value })
}

export default useSaveProfile
