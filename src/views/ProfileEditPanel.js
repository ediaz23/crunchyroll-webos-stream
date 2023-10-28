import { useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import { Panel, Header } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'

import $L from '@enact/i18n/$L'
import { useRecoilValue } from 'recoil'

import ProfileDetail from '../components/profile/Detail'
import ContactMe from '../components/login/ContactMe'
import Logout from '../components/login/Logout'

import { currentProfileState } from '../recoilConfig'
import { useMapLang } from '../hooks/language'
import api from '../api'


const EditProfilePanel = ({ ...rest }) => {
    /** @type {Function} */
    const mapLang = useMapLang()
    /** @type {import('crunchyroll-js-api/src/types').Profile, Function}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [audioLangList, setAudioLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [subtitleLangList, setSubtitleLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [contentLangList, setContentLangList] = useState([])
    const langList = { audio: audioLangList, subtitles: subtitleLangList, content: contentLangList }

    useEffect(() => {
        const loadData = async () => {
            setAudioLangList((await api.misc.getAudioLangList()).map(mapLang))
            setSubtitleLangList((await api.misc.getSubtitleLangList()).map(mapLang))
            setContentLangList((await api.misc.getContentLangList()).map(mapLang))
        }
        loadData()
    }, [mapLang])

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
            <ProfileDetail {...{ profile, langList }} />
        </Panel>
    )
}

export default EditProfilePanel
