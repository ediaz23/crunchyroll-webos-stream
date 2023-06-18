import { useCallback, useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import { Header, Panel } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'

import $L from '@enact/i18n/$L'
import { useSetRecoilState } from 'recoil'

import Profile from '../components/Profile'
import ContactMe from '../components/ContactMe'
import Logout from '../components/Logout'
import { pathState, currentProfileState } from '../recoilConfig'
import api from '../api'
import back from '../back'


const ProfilesPanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setCurrentProfile = useSetRecoilState(currentProfileState)
    /** @type {[Array<import('crunchyroll-js-api/src/types').Profile>, Function]}  */
    const [profiles, setProfiles] = useState([])

    const setProfile = useCallback((event) => {
        /** @type {HTMLElement} */
        const parentElement = event.target.closest('[data-profile-id]')
        const profileId = parentElement.getAttribute('data-profile-id')
        const profile = profiles.find(p => p.id === parseInt(profileId))
        setCurrentProfile(profile)
    }, [setCurrentProfile, profiles])

    const onSelectProfile = useCallback(event => {
        setProfile(event)
        back.pushHistory({ doBack: () => { setPath('/profiles') } })
        setPath('/profiles/home')
    }, [setProfile, setPath])
    const onEditProfile = useCallback(event => {
        setProfile(event)
        back.pushHistory({ doBack: () => { setPath('/profiles') } })
        setPath('/profiles/edit')
    }, [setProfile, setPath])


    useEffect(() => {
        const loadData = async () => {
            setProfiles(await api.getProfiles())
        }
        loadData()
    }, [])

    /** @todo remover */
    useEffect(() => {
        if (profiles && profiles.length) {
            setCurrentProfile(profiles[0])
            back.pushHistory({ doBack: () => { setPath('/profiles') } })
            setPath('/profiles/home')
        }
    }, [profiles, setCurrentProfile, setPath])

    const rowStyle = { marginTop: '1rem' }
    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='profiles' />
                <Logout />
            </Header>
            <Row align='center center' style={rowStyle}>
                <Heading size='large'>
                    {$L('Who is watching?')}
                </Heading>
            </Row>
            <Row align='center center' style={rowStyle}>
                {profiles.map((profile, i) =>
                    <Profile profile={profile} key={i}
                        onSelectProfile={onSelectProfile}
                        onEditProfile={onEditProfile} />
                )}
            </Row>
            <Row align='center center' style={rowStyle}>
                <Logout text={$L('Logout')} />
            </Row>
        </Panel>
    )
}

export default ProfilesPanel

