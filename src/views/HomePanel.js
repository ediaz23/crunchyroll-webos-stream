
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'

import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'

import {
    currentProfileState, categoriesState,
    homeViewReadyState, homeIndexState,
    homeFeedState, homeFeedExpirationState,
    musicFeedState, musicFeedExpirationState,
} from '../recoilConfig'
import HomeToolbar, { FloatingHomeToolbar } from '../components/home/Toolbar'
import HomeFeed from '../components/home/Feed'
import MusicBrowse from '../components/music/Music'
import ContentGrid from '../components/grid/ContentGrid'
import Simulcast from '../components/simulcast/Simulcast'
import Watchlist from '../components/watchlist/Watchlist'
import api from '../api'
import ContactMePanel from './ContactMePanel'
import ConfirmExitPanel from './ConfirnExitPanel'
import { $L } from '../hooks/language'
import { useResetHomeState } from '../hooks/setContent'
import { useHomeFeedWorker } from '../hooks/homefeedWorker'


/**
 * Hook helper
 * @param {Function} setHomeFeed
 * @returns {Function}
 */
const useSetFeed = (setHomeFeed) => {
    return (index, feedItem) => {
        setHomeFeed(prevArray => [
            ...prevArray.slice(0, index),
            feedItem,
            ...prevArray.slice(index + 1)
        ])
    }
}

const ActivityViews = ({ index, children }) => (children[index])

const HomePanel = (props) => {
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Number, Function]} */
    const [currentActivity, setCurrentActivity] = useRecoilState(homeIndexState)
    /** @type {[Array<Object>, Function]} */
    const [showFullToolbar, setShowFullToolbar] = useState(false)
    /** @type {[Boolean, Function]} */
    const [homeViewReady, setHomeViewReady] = useRecoilState(homeViewReadyState)
    /** @type {Function} */
    const setCategories = useSetRecoilState(categoriesState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    /** @type {[Array<import('../hooks/homefeedWorker').HomefeedItem>, Function]} */
    const [homeFeed, setHomeFeed] = useRecoilState(homeFeedState)
    /** @type {[Date, Function]} */
    const [homeFeedExpiration, setHomeFeedExpiration] = useRecoilState(homeFeedExpirationState)
    /** @type {Function} */
    const setHomeFeedFn = useSetFeed(setHomeFeed)

    /** @type {[Array<Object>, Function]} */
    const [musicFeed, setMusicFeed] = useRecoilState(musicFeedState)
    /** @type {[Date, Function]} */
    const [musicFeedExpiration, setMusicFeedExpiration] = useRecoilState(musicFeedExpirationState)
    /** @type {Function} */
    const setMusicFeedFn = useSetFeed(setMusicFeed)
    /** @type {Function} */
    const resetHomeState = useResetHomeState()
    const processHomeFeed = useHomeFeedWorker()

    /** @type {Array<{key: String, icon: String, label: String}>} */
    const toolbarList = useMemo(() => [
        { key: 'home', icon: 'home', label: $L('Home') },
        { key: 'simulcast', icon: 'resumeplay', label: $L('Simulcast') },
        { key: 'search', icon: 'search', label: $L('Search') },
        { key: 'series', icon: 'series', label: $L('Series') },
        { key: 'movies', icon: 'recordings', label: $L('Movies') },
        { key: 'musics', icon: 'music', label: $L('Music') },
        { key: 'my_list', icon: 'denselist', label: $L('My List') },
        { key: 'info', icon: 'info', label: $L('About Me?') },
        { key: 'close', icon: 'closex', label: $L('Close') },
    ], [])

    /** @type {Function} */
    const hideShowFullToolbar = useCallback(() => {
        setShowFullToolbar(false)
    }, [setShowFullToolbar])

    /** @type {Function} */
    const setActivity = useCallback((ev) => {
        setShowFullToolbar(false)
        const tmpIndex = ev ? parseInt(ev.currentTarget.dataset.index) : 0
        setCurrentActivity(tmpIndex)
        if (tmpIndex !== currentActivity) {
            resetHomeState()
        }
    }, [setCurrentActivity, setShowFullToolbar, currentActivity, resetHomeState])

    /** @type {Function} */
    const showToolbar = useCallback((ev) => {
        if (homeViewReady) {
            ev.target.blur()
            setShowFullToolbar(true)
        }
    }, [setShowFullToolbar, homeViewReady])

    useEffect(() => {
        const loadFeed = async () => {
            const now = new Date()
            if (currentActivity === 0 && (!homeFeedExpiration || (now > homeFeedExpiration))) {
                await Promise.all([
                    api.discover.getNewHomeFeed(profile).then(processHomeFeed).then(setHomeFeed),
                    api.discover.getCategories(profile).then(({ data: categs }) => {
                        setCategories([
                            { id: 'all', title: $L('All') },
                            ...categs.map(cat => { return { id: cat.id, title: cat.localization.title } })
                        ])
                    }),
                ])
                now.setHours(now.getHours() + 3)
                setHomeFeedExpiration(now)
            }
            if (currentActivity === 5 && (!musicFeedExpiration || (now > musicFeedExpiration))) {
                api.music.getFeed(profile).then(processHomeFeed).then(setMusicFeed)
                now.setHours(now.getHours() + 3)
                setMusicFeedExpiration(now)
            }
        }
        setLoading(true)
        loadFeed().then(() => setLoading(false))
    }, [profile, currentActivity, setCategories,
        setHomeFeed, homeFeedExpiration, setHomeFeedExpiration,
        setMusicFeed, musicFeedExpiration, setMusicFeedExpiration,
        processHomeFeed,
    ])

    useEffect(() => {
        return () => {
            setHomeViewReady(false)
        }
    }, [setHomeViewReady])

    return (
        <Panel {...props}>
            <Row style={{ height: '100%' }}>
                <Cell shrink>
                    <HomeToolbar toolbarList={toolbarList}
                        currentIndex={currentActivity}
                        onClick={setActivity}
                        onFocus={showToolbar}
                        hideText />
                </Cell>
                <Cell grow>
                    {loading &&
                        <Column align='center center'>
                            <Spinner />
                        </Column>
                    }
                    {!loading &&
                        <ActivityViews index={currentActivity}>
                            <HomeFeed profile={profile}
                                homeFeed={homeFeed}
                                setHomeFeed={setHomeFeedFn} />
                            <Simulcast profile={profile}
                                title={toolbarList[currentActivity].label} />
                            <ContentGrid profile={profile}
                                contentKey='search'
                                title={toolbarList[currentActivity].label} />
                            <ContentGrid profile={profile}
                                contentKey='series'
                                contentType='series'
                                title={toolbarList[currentActivity].label} />
                            <ContentGrid profile={profile}
                                contentKey='movies'
                                contentType='movie_listing'
                                title={toolbarList[currentActivity].label} />
                            <MusicBrowse profile={profile}
                                contentKey='music'
                                title={toolbarList[currentActivity].label}
                                musicFeed={musicFeed}
                                setMusicFeed={setMusicFeedFn} />
                            <Watchlist profile={profile} />
                            <ContactMePanel noAcceptBtn />
                            <ConfirmExitPanel onCancel={setActivity} />
                        </ActivityViews>
                    }
                </Cell>
            </Row>
            <FloatingHomeToolbar
                open={showFullToolbar}
                toolbarList={toolbarList}
                currentIndex={currentActivity}
                onClick={setActivity}
                onLeave={hideShowFullToolbar}
            />
        </Panel>
    )
}

export default HomePanel
