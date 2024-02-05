import { useCallback, useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import Heading from '@enact/ui/Heading'
import Spotlight from '@enact/spotlight'

import { Header, Panel } from '@enact/moonstone/Panels'

import $L from '@enact/i18n/$L'
import { useSetRecoilState } from 'recoil'

import { pathState, currentProfileState, homeFeedState, homefeedReadyState } from '../recoilConfig'
import Profile from '../components/profile/Profile'
import ContactMe from '../components/login/ContactMe'
import Logout from '../components/login/Logout'
import api from '../api'
import { DEV_FAST_SELECT } from '../const'
import back from '../back'


const ProfilesPanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setCurrentProfile = useSetRecoilState(currentProfileState)
    /** @type {[Array<import('crunchyroll-js-api/src/types').Profile>, Function]}  */
    const [profiles, setProfiles] = useState([])
    /** @type {Function} */
    const setHomeFeed = useSetRecoilState(homeFeedState)
    /** @type {Function} */
    const setHomefeedReady = useSetRecoilState(homefeedReadyState)

    /** @type {Function} */
    const getProfileFromEvent = useCallback((event) => {
        /** @type {HTMLElement} */
        const parentElement = event.target.closest('[data-profile-id]')
        const profileId = parentElement.getAttribute('data-profile-id')
        return profiles.find(p => p.id === parseInt(profileId))
    }, [profiles])

    /** @type {Function} */
    const doSelectProfile = useCallback(profile => {
        setHomefeedReady(false)
        setHomeFeed([])
        setCurrentProfile(profile)
        back.pushHistory({ doBack: () => { setPath('/profiles') } })
        setPath('/profiles/home')
    }, [setCurrentProfile, setPath, setHomeFeed, setHomefeedReady])

    /** @type {Function} */
    const onSelectProfile = useCallback(event => {
        doSelectProfile(getProfileFromEvent(event))
    }, [getProfileFromEvent, doSelectProfile])

    /** @type {Function} */
    const onEditProfile = useCallback(event => {
        setCurrentProfile(getProfileFromEvent(event))
        back.pushHistory({ doBack: () => { setPath('/profiles') } })
        setPath('/profiles/edit')
    }, [getProfileFromEvent, setCurrentProfile, setPath])

    /** @type {Function} */
    const setFocus = useCallback(node => {
        if (node && node.dataset.profileId === '0') {
            node.focus()
            Spotlight.focus(node)
        }
    }, [])

    useEffect(() => {
        if (DEV_FAST_SELECT && profiles && profiles.length) {
            doSelectProfile(profiles[0])
        }
    }, [profiles, doSelectProfile])

    useEffect(() => { api.account.getProfiles().then(setProfiles) }, [])

    const rowStyle = { marginTop: '1rem' }
    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='profiles' />
                <Logout />
            </Header>
            <Row align='center center' style={rowStyle}>
                <Heading size='title'>
                    {$L('Who is watching?')}
                </Heading>
            </Row>
            <Row align='center center' style={rowStyle}>
                {profiles.map((profile, i) =>
                    <Profile profile={profile} key={i}
                        onSelectProfile={onSelectProfile}
                        onEditProfile={onEditProfile}
                        compRef={setFocus} />
                )}
            </Row>
            <Row align='center center' style={rowStyle}>
                <Logout text={$L('Logout')} />
            </Row>
        </Panel>
    )
}

export default ProfilesPanel

