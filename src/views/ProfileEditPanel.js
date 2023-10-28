import { useCallback, useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import { Panel, Header } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'

import $L from '@enact/i18n/$L'
import { useRecoilState } from 'recoil'

import ProfileDetail from '../components/profile/Detail'
import ContactMe from '../components/login/ContactMe'
import Logout from '../components/login/Logout'

import { currentProfileState } from '../recoilConfig'
import useGetLanguage from '../hooks/getLanguage'
import api from '../api'


const EditProfilePanel = ({ ...rest }) => {
    const getLanguage = useGetLanguage()
    /** @type {[import('crunchyroll-js-api/src/types').Profile, Function]}*/
    const [profile, setProfile] = useRecoilState(currentProfileState)
    /** @type {[Array<{value: String, label: String}>, Function]} */
    const [audioLangList, setAudioLangList] = useState([])
    /** @type {[Array<{value: String, label: String}>, Function]} */
    const [subtitleLangList, setSubtitleLangList] = useState([])
    /** @type {[Array<{value: String, label: String}>, Function]} */
    const [contentLangList, setContentLangList] = useState([])
    const langList = { audio: audioLangList, subtitles: subtitleLangList, content: contentLangList }

    const convertLang = useCallback(lang => {
        return { value: lang, label: getLanguage(lang) }
    }, [getLanguage])

    const saveProfile = useCallback(async (name, value) => {
        const newValue = {}
        newValue[name] = value
        await api.account.updateProfile(newValue)
        setProfile({ ...profile, ...newValue })
    }, [setProfile, profile])

    useEffect(() => {
        const loadData = async () => {
            setAudioLangList((await api.misc.getAudioLangList()).map(convertLang))
            setSubtitleLangList((await api.misc.getSubtitleLangList()).map(convertLang))
            setContentLangList((await api.misc.getContentLangList()).map(convertLang))
        }
        loadData()
    }, [convertLang, getLanguage])

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
            <ProfileDetail {...{ profile, langList, saveProfile }} />
        </Panel>
    )
}

export default EditProfilePanel
