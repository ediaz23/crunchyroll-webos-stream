
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Transition from '@enact/ui/Transition'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'

import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'

import {
    currentProfileState, homefeedReadyState, homeIndexState, selectedContentState,
    homeFeedState, homeFeedProcessedState, homeFeedExpirationState,
    musicFeedState, musicFeedProcessedState, musicFeedExpirationState,
    categoriesState,
} from '../recoilConfig'
import HomeToolbar, { HomeToolbarSpotlight } from '../components/home/Toolbar'
import HomeFeed from '../components/home/Feed'
import MusicBrowse from '../components/music/Browse'
import ContentGrid from '../components/grid/ContentGrid'
import Watchlist from '../components/watchlist/Watchlist'
import FloatingLayerFix from '../patch/FloatingLayer'
import api from '../api'
import ContactMePanel from './ContactMePanel'
import ConfirmExitPanel from './ConfirnExitPanel'
import { $L } from '../hooks/language'


/**
 * Process the feed
 * @param {Array<{resource_type: String}>} feed
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Array<Object>>}
 */
const postProcessHomefeed = (feed) => {
    const mergedFeed = []
    const panelObject = { resource_type: 'panel', panels: [] }
    const bannerObject = { resource_type: 'in_feed_banner', panels: [] }
    const musicArtistObject = { resource_type: 'music_artist_banner', panels: [] }
    for (const item of feed) {
        if (item.resource_type === 'panel') {
            // find one panel then add to panelObject
            // only if not added before
            if (panelObject.panels.length === 0) {
                mergedFeed.push(panelObject)
            }
            panelObject.panels.push(item)
        } else if (item.resource_type === 'in_feed_banner') {
            if (bannerObject.panels.length === 0) {
                mergedFeed.push(bannerObject)
            }
            bannerObject.panels.push(item)
        } else if (item.resource_type === 'musicArtist') {
            if (musicArtistObject.panels.length === 0) {
                mergedFeed.push(musicArtistObject)
            }
            musicArtistObject.panels.push(item)
        } else {
            mergedFeed.push(item)
        }
    }
    return mergedFeed
}

const ActivityViews = ({ index, children }) => (children[index])

const HomePanel = (props) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Number, Function]} */
    const [currentActivity, setCurrentActivity] = useRecoilState(homeIndexState)
    /** @type {[Array<Object>, Function]} */
    const [showFullToolbar, setShowFullToolbar] = useState(false)
    /** @type {[Boolean, Function]} */
    const [homefeedReady, setHomefeedReady] = useRecoilState(homefeedReadyState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)

    /** @type {[Array<Object>, Function]} */
    const [homefeed, setHomefeed] = useRecoilState(homeFeedState)
    /** @type {[Date, Function]} */
    const [homeFeedExpiration, setHomeFeedExpiration] = useRecoilState(homeFeedExpirationState)
    /** @type {Function} */
    const setHomeFeedProcessed = useSetRecoilState(homeFeedProcessedState)

    /** @type {[Array<Object>, Function]} */
    const [musicfeed, setMusicfeed] = useRecoilState(musicFeedState)
    /** @type {[Date, Function]} */
    const [musicFeedExpiration, setMusicFeedExpiration] = useRecoilState(musicFeedExpirationState)
    /** @type {Function} */
    const setMusicFeedProcessed = useSetRecoilState(musicFeedProcessedState)
    /** @type {Function} */
    const setCategories = useSetRecoilState(categoriesState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

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
    const toggleShowFullToolbar = useCallback(() => {
        setShowFullToolbar(val => !val)
    }, [setShowFullToolbar])

    /** @type {Function} */
    const setActivity = useCallback((ev) => {
        setShowFullToolbar(false)
        setCurrentActivity(parseInt(ev.currentTarget.dataset.index))
    }, [setCurrentActivity, setShowFullToolbar])

    /** @type {Function} */
    const showToolbar = useCallback((ev) => {
        if (homefeedReady) {
            ev.target.blur()
            toggleShowFullToolbar()
        }
    }, [toggleShowFullToolbar, homefeedReady])

    useEffect(() => {
        const loadFeed = async () => {
            const now = new Date()
            if (currentActivity === 0 && (!homeFeedExpiration || (now > homeFeedExpiration))) {
                const { data: categs } = await api.discover.getCategories(profile)
                setCategories([{ id: 'all', localization: { title: $L('All') } }, ...categs])
                const { data } = await api.discover.getHomeFeed(profile)
                /** @type {Array} */
                const filterFeed = data.filter(item => item.response_type !== 'news_feed')
                setHomeFeedProcessed(new Array(filterFeed.length))
                setHomefeed(postProcessHomefeed(filterFeed))
                now.setHours(now.getHours() + 3)
                setHomeFeedExpiration(now)
                setSelectedContent(null)
            }
            if (currentActivity === 5 && (!musicFeedExpiration || (now > musicFeedExpiration))) {
                const { data } = await api.music.getFeed(profile)
                /** @type {Array} */
                const musicFilterFeed = data.filter(item => item.response_type !== 'news_feed')
                setMusicFeedProcessed(new Array(musicFilterFeed.length))
                setMusicfeed(postProcessHomefeed(musicFilterFeed))
                now.setHours(now.getHours() + 3)
                setMusicFeedExpiration(now)
                setSelectedContent(null)
            }
            if (currentActivity === 6) {
                setSelectedContent(null)
            }
        }
        setLoading(true)
        loadFeed().then(() => setLoading(false))
    }, [profile, currentActivity, setSelectedContent, setCategories,
        setHomefeed, setHomeFeedProcessed, homeFeedExpiration, setHomeFeedExpiration,
        setMusicfeed, setMusicFeedProcessed, musicFeedExpiration, setMusicFeedExpiration,
    ])

    useEffect(() => {
        return () => {
            setHomefeedReady(false)
        }
    }, [setHomefeedReady])

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
                    {loading ?
                        <Column align='center center'>
                            <Spinner />
                        </Column>
                        :
                        <ActivityViews index={currentActivity}>
                            <HomeFeed profile={profile} homefeed={homefeed} />
                            <ContentGrid profile={profile}
                                contentKey='simulcast'
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
                            <MusicBrowse profile={profile} musicfeed={musicfeed} />
                            <Watchlist profile={profile} />
                            <ContactMePanel noAcceptBtn />
                            <ConfirmExitPanel onCancel={toggleShowFullToolbar} />
                        </ActivityViews>
                    }
                </Cell>
            </Row>
            <Transition visible={showFullToolbar} type='slide' direction='right'>
                <FloatingLayerFix open={showFullToolbar} onDismiss={toggleShowFullToolbar}
                    style={{
                        background: 'linear-gradient(to right, #000000 20%, rgba(0, 0, 0, 0))',
                        paddingLeft: '2rem',
                    }}>
                    <HomeToolbarSpotlight toolbarList={toolbarList}
                        currentIndex={currentActivity}
                        onClick={setActivity}
                        onLeave={toggleShowFullToolbar}
                        autoFocus />
                </FloatingLayerFix>
            </Transition>
        </Panel>
    )
}

export default HomePanel
