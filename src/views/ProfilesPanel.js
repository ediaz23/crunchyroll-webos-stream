
import { useCallback, useEffect, useState } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/ui/Heading'
import Spotlight from '@enact/spotlight'
import { Header, Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'
import Button from '@enact/moonstone/Button'
import Icon from '@enact/moonstone/Icon'
import { useSetRecoilState } from 'recoil'

import { $L } from '../hooks/language'
import { currentProfileState, homeViewReadyState } from '../recoilConfig'
import Profile from '../components/profile/Profile'
import ContactMe from '../components/login/ContactMe'
import Logout from '../components/login/Logout'
import DevBtn from '../components/DevBtn'
import api from '../api'
import { DEV_FAST_SELECT } from '../const'
import { useNavigate, useResetHomeState } from '../hooks/navigate'


const ProfilesPanel = ({ ...rest }) => {
    const { goTo } = useNavigate()
    /** @type {Function} */
    const setCurrentProfile = useSetRecoilState(currentProfileState)
    /** @type {[import('crunchyroll-js-api').Types.ProfileResponse, Function]}  */
    const [multiProfile, setMultiProfile] = useState(null)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)
    /** @type {Function} */
    const resetHomeState = useResetHomeState()

    /** @type {Function} */
    const getProfileFromEvent = useCallback((event) => {
        /** @type {HTMLElement} */
        const parentElement = event.target.closest('[data-profile-id]')
        const profileId = parentElement.getAttribute('data-profile-id')
        return multiProfile.profiles.find(p => p.profile_id === profileId)
    }, [multiProfile])

    /** @type {Function} */
    const doSelectProfile = useCallback(profile => {
        setLoading(true)
        api.utils.clearCache()
        api.auth.switchProfile(profile.profile_id).then(() => {
            setLoading(false)
            setHomeViewReady(false)
            setCurrentProfile(profile)
            resetHomeState()
            goTo('/profiles/home')
        })
    }, [setCurrentProfile, goTo, resetHomeState, setHomeViewReady, setLoading])

    /** @type {Function} */
    const onSelectProfile = useCallback(event => {
        doSelectProfile(getProfileFromEvent(event))
    }, [getProfileFromEvent, doSelectProfile])

    /** @type {Function} */
    const onEditProfile = useCallback(event => {
        const mainProfile = multiProfile.profiles.find(p => p.is_primary)
        setCurrentProfile({
            ...getProfileFromEvent(event),
            email: mainProfile.email,
        })
        goTo('/profiles/edit')
    }, [multiProfile, getProfileFromEvent, setCurrentProfile, goTo])

    /** @type {Function} */
    const onCreateProfile = useCallback(() => {
        const mainProfile = multiProfile.profiles.find(p => p.is_primary)
        setCurrentProfile({
            ...mainProfile,
            is_primary: false,
            profile_id: null,
            profile_name: ''
        })
        goTo('/profiles/edit')
    }, [multiProfile, setCurrentProfile, goTo])

    /** @type {Function} */
    const setFocus = useCallback(ev => {
        if (ev && ev.node && multiProfile && multiProfile.profiles.length) {
            if (ev.node.dataset.profileId === multiProfile.profiles[0].profile_id) {
                ev.node.focus()
                Spotlight.focus(ev.node)
            }
        }
    }, [multiProfile])

    useEffect(() => {
        if (DEV_FAST_SELECT && multiProfile && multiProfile.profiles.length) {
            doSelectProfile(multiProfile.profiles[0])
        }
    }, [multiProfile, doSelectProfile])

    useEffect(() => {
        api.account.getProfiles().then(setMultiProfile)
    }, [])

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe />
                <Logout />
            </Header>
            <Column align='center'>
                {!loading && multiProfile && multiProfile.profiles.length ?
                    <>
                        <Row align='center center'>
                            <Heading size='title'>
                                {$L('Who will go on an adventure?')}
                            </Heading>
                        </Row>
                        <Row align='center center' style={{ marginTop: '1rem' }}>
                            {multiProfile.profiles.map((profile, i) =>
                                <Profile profile={profile} key={i}
                                    onSelectProfile={onSelectProfile}
                                    onEditProfile={onEditProfile}
                                    compRef={setFocus} />
                            )}
                        </Row>
                        <Row align='center center' style={{ marginTop: '3rem' }}>
                            {multiProfile.profiles.length < multiProfile.tier_max_profiles &&
                                <Button onClick={onCreateProfile}>
                                    <Icon style={{ marginRight: '0.5rem' }}>
                                        plus
                                    </Icon>
                                    {$L('Add')}
                                </Button>
                            }
                            <DevBtn />
                        </Row>
                    </>
                    :
                    <Spinner />
                }
            </Column>
        </Panel>
    )
}

export default ProfilesPanel
