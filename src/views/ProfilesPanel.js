
import { useCallback, useEffect, useState } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/ui/Heading'
import Spotlight from '@enact/spotlight'
import { Header, Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'
import { useSetRecoilState } from 'recoil'

import { $L } from '../hooks/language'
import {
    pathState, currentProfileState, selectedContentState,
    homeIndexState, homePositionState, homeViewReadyState,
    homeFeedState, homeFeedExpirationState,
    musicFeedExpirationState,
} from '../recoilConfig'
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
    /** @type {[import('crunchyroll-js-api').Types.ProfileResponse, Function]}  */
    const [multiProfile, setMultiProfile] = useState(null)
    /** @type {Function} */
    const setHomeFeed = useSetRecoilState(homeFeedState)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setHomeFeedExpiration = useSetRecoilState(homeFeedExpirationState)
    /** @type {Function} */
    const setMusicFeedExpiration = useSetRecoilState(musicFeedExpirationState)
    /** @type {Function} */
    const setCurrentActivity = useSetRecoilState(homeIndexState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)

    /** @type {Function} */
    const getProfileFromEvent = useCallback((event) => {
        /** @type {HTMLElement} */
        const parentElement = event.target.closest('[data-profile-id]')
        const profileId = parentElement.getAttribute('data-profile-id')
        return multiProfile.profiles.find(p => p.profile_id === profileId)
    }, [multiProfile])

    /** @type {Function} */
    const doSelectProfile = useCallback(profile => {
        api.auth.switchProfile(profile.profile_id).then(() => {
            setHomeViewReady(false)
            setHomeFeed([])
            setCurrentProfile(profile)
            setSelectedContent(null)
            setHomeFeedExpiration(null)
            setMusicFeedExpiration(null)
            setCurrentActivity(0)
            setHomePosition({ rowIndex: 0, columnIndex: 0 })
            back.pushHistory({ doBack: () => { setPath('/profiles') } })
            setPath('/profiles/home')
        })
    }, [setCurrentProfile, setPath, setSelectedContent, setCurrentActivity, setHomePosition,
        setHomeFeed, setHomeViewReady,
        setMusicFeedExpiration, setHomeFeedExpiration])

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
        if (node && multiProfile && multiProfile.profiles.length) {
            if (node.dataset.profileId === multiProfile.profiles[0].profile_id) {
                node.focus()
                Spotlight.focus(node)
            }
        }
    }, [multiProfile])

    useEffect(() => {
        if (DEV_FAST_SELECT && multiProfile && multiProfile.profiles.length) {
            doSelectProfile(multiProfile.profiles[0])
        }
    }, [multiProfile, doSelectProfile])

    useEffect(() => { api.account.getProfiles().then(setMultiProfile) }, [])

    const rowStyle = { marginTop: '1rem' }
    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='profiles' />
                <Logout />
            </Header>
            <Column align='center center'>
                {multiProfile && multiProfile.profiles.length ?
                    <>
                        <Row align='center center'>
                            <Heading size='title'>
                                {$L('Who will go on an adventure?')}
                            </Heading>
                        </Row>
                        <Row align='center center' style={rowStyle}>
                            {multiProfile.profiles.map((profile, i) =>
                                <Profile profile={profile} key={i}
                                    onSelectProfile={onSelectProfile}
                                    onEditProfile={onEditProfile}
                                    compRef={setFocus} />
                            )}
                        </Row>
                        <Row align='center center' style={rowStyle}>
                            <Logout text={$L('Logout')} />
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

