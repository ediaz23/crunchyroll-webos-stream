
import { useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import { Panel, Header } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'
import Spinner from '@enact/moonstone/Spinner'

import { useRecoilValue } from 'recoil'

import ProfileDetail from '../components/profile/Detail'
import ContactMe from '../components/login/ContactMe'
import Logout from '../components/login/Logout'

import { currentProfileState } from '../recoilConfig'
import { useMapLang, $L } from '../hooks/language'
import api from '../api'

/**
 * @param {Array<import('crunchyroll-js-api').Types.AssesItem} plist
 * @returns {String}
 */
function getRamdomItem(pList) {
    const item = pList[Math.floor(Math.random() * pList.length)]
    return item.assets[Math.floor(Math.random() * item.assets.length)].id
}


const EditProfilePanel = ({ ...rest }) => {
    /** @type {Function} */
    const mapLang = useMapLang()
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [audioLangs, setAudioLangs] = useState(null)
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [subtitleLangs, setSubtitleLangs] = useState(null)
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [contentLangs, setContentLangs] = useState(null)
    /** @type {[Array<String>, Function]} */
    const [usernames, setUsernames] = useState(null)
    /** @type {[Array<import('crunchyroll-js-api').Types.AssesItem>, Function]} */
    const [avatars, setAvatars] = useState(null)
    /** @type {[Array<import('crunchyroll-js-api').Types.AssesItem>, Function]} */
    const [wallpapers, setWallpapers] = useState(null)
    /** @type {[import('crunchyroll-js-api').Types.Profile, Function]}*/
    const [extraProfile, setExtraProfile] = useState({})
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        setLoading(true)
        api.account.getUsernames().then(setUsernames)
        api.misc.getAudioLangList().then(res => res.map(mapLang)).then(setAudioLangs)
        api.misc.getSubtitleLangList().then(res => res.map(mapLang)).then(setSubtitleLangs)
        api.misc.getContentLangList().then(res => res.map(mapLang)).then(setContentLangs)
        api.assets.getAvatarList(profile.preferred_communication_language).then(setAvatars)
        api.assets.getWallpaper(profile.preferred_communication_language).then(setWallpapers)
    }, [mapLang, setLoading, profile])


    useEffect(() => {
        if (
            loading &&
            audioLangs !== null &&
            subtitleLangs !== null &&
            contentLangs !== null &&
            usernames !== null &&
            avatars !== null &&
            wallpapers !== null
        ) {
            if (!profile.profile_id) {
                setExtraProfile({
                    username: usernames[Math.floor(Math.random() * usernames.length)],
                    wallpaper: getRamdomItem(wallpapers),
                    avatar: getRamdomItem(avatars),
                })
            }
            setLoading(false)
        }
    }, [
        loading,
        audioLangs,
        subtitleLangs,
        contentLangs,
        usernames,
        avatars,
        wallpapers,
        profile,
        setExtraProfile,
        setLoading,
    ])

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='profiles/edit' />
                <Logout />
            </Header>
            <Row align='center center'>
                <Heading size='large'>
                    {$L('Profile')}
                </Heading>
            </Row>
            {loading ?
                <Row align='center center'>
                    <Spinner />
                </Row>
                :
                <ProfileDetail
                    {...{
                        profile: { ...profile, ...extraProfile },
                        audioLangs,
                        subtitleLangs,
                        contentLangs,
                        usernames,
                        avatars,
                        wallpapers,
                    }} />
            }
        </Panel>
    )
}

export default EditProfilePanel
