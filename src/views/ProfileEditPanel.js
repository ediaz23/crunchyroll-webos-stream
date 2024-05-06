
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


const EditProfilePanel = ({ ...rest }) => {
    /** @type {Function} */
    const mapLang = useMapLang()
    /** @type {import('crunchyroll-js-api').Types.Profile, Function}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [audioLangList, setAudioLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [subtitleLangList, setSubtitleLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [contentLangList, setContentLangList] = useState([])
    const langList = { audio: audioLangList, subtitles: subtitleLangList, content: contentLangList }
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        Promise.all([
            api.misc.getAudioLangList().then(res => res.map(mapLang)).then(setAudioLangList),
            api.misc.getSubtitleLangList().then(res => res.map(mapLang)).then(setSubtitleLangList),
            api.misc.getContentLangList().then(res => res.map(mapLang)).then(setContentLangList)
        ]).then(() => setLoading(false))
    }, [mapLang, setLoading])

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
                    profile={profile}
                    langList={langList} />
            }
        </Panel>
    )
}

export default EditProfilePanel
