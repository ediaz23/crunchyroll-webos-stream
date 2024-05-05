
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Transition from '@enact/ui/Transition'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'

import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'

import {
    currentProfileState, selectedContentState, categoriesState,
    homeViewReadyState, homeIndexState, homePositionState,
    homeFeedState, homeFeedExpirationState,
    musicFeedState, musicFeedExpirationState,
} from '../recoilConfig'
import HomeToolbar, { HomeToolbarSpotlight } from '../components/home/Toolbar'
import HomeFeed from '../components/home/Feed'
import MusicBrowse from '../components/music/Music'
import ContentGrid from '../components/grid/ContentGrid'
import Simulcast from '../components/simulcast/Simulcast'
import Watchlist from '../components/watchlist/Watchlist'
import FloatingLayerFix from '../patch/FloatingLayer'
import api from '../api'
import ContactMePanel from './ContactMePanel'
import ConfirmExitPanel from './ConfirnExitPanel'
import { $L } from '../hooks/language'


/**
 * Process the feed
 * @param {Array<{resource_type: String}>} feed
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<Array<Object>>}
 */
const postProcessHomefeed = (feed) => {
    const mergedFeed = []
    const panelObject = { resource_type: 'panel', panels: [] }
    const bannerObject = { resource_type: 'in_feed_banner', panels: [] }
    const musicArtistObject = { resource_type: 'music_artist_banner', panels: [] }
    for (let item of feed) {
        if (item.resource_type === 'panel') {
            // find one panel then add to panelObject
            // only if not added before
            if (panelObject.panels.length === 0) {
                mergedFeed.push(panelObject)
            }
            let newItem = { panel: item.panel }
            if (panelObject.panels.length === 0) {
                Object.assign(newItem, {
                    resource_type: item.resource_type,
                    response_type: item.response_type,
                })
            }
            panelObject.panels.push(newItem)
        } else if (item.resource_type === 'in_feed_banner') {
            if (bannerObject.panels.length === 0) {
                mergedFeed.push(bannerObject)
            }
            let newItem = {
                resource_type: item.resource_type,
                link: item.link,
            }
            if (bannerObject.panels.length === 0) {
                Object.assign(newItem, {
                    id: item.id,
                    response_type: item.response_type,
                })
            }
            bannerObject.panels.push(newItem)
        } else if (item.resource_type === 'musicArtist') {
            if (musicArtistObject.panels.length === 0) {
                mergedFeed.push(musicArtistObject)
            }
            let newItem = { object: item.object }
            if (musicArtistObject.panels.length === 0) {
                Object.assign(newItem, {
                    id: item.id,
                    resource_type: item.resource_type,
                    response_type: item.response_type,
                })
            }
            musicArtistObject.panels.push(newItem)
        } else {
            let newItem = {
                id: item.id,
                resource_type: item.resource_type,
                response_type: item.response_type,
            }
            if (item.resource_type === 'hero_carousel') {
                newItem.items = item.items.map(i => {
                    return {
                        slug: i.slug,
                        link: i.link,
                    }
                })
            } else if (item.resource_type === 'curated_collection') {
                Object.assign(newItem, {
                    title: item.title,
                    ids: item.ids,
                })
                if (item.collection_items) {
                    newItem.ids = item.collection_items.map(i => i.id)
                }
            } else if (item.resource_type === 'dynamic_collection') {
                Object.assign(newItem, {
                    title: item.title,
                    source_media_id: item.source_media_id,
                    query_params: item.query_params,
                })
            } else {
                Object.assign(newItem, item)
            }
            mergedFeed.push(newItem)
        }
    }
    return mergedFeed
}

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
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setCategories = useSetRecoilState(categoriesState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)

    /** @type {[Array<Object>, Function]} */
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
        const tmpIndex = parseInt(ev.currentTarget.dataset.index)
        setCurrentActivity(tmpIndex)
        if (tmpIndex !== currentActivity) {
            setHomePosition({ rowIndex: 0, columnIndex: 0 })
            setSelectedContent(null)
        }
    }, [setCurrentActivity, setShowFullToolbar, setHomePosition, currentActivity, setSelectedContent])

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
                const { data: categs } = await api.discover.getCategories(profile)
                setCategories([
                    { id: 'all', title: $L('All') },
                    ...categs.map(cat => { return { id: cat.id, title: cat.localization.title } })
                ])
                const { data } = await api.discover.getHomeFeed(profile)
                setHomeFeed(postProcessHomefeed(data.filter(item => item.response_type !== 'news_feed')))
                now.setHours(now.getHours() + 3)
                setHomeFeedExpiration(now)
            }
            if (currentActivity === 5 && (!musicFeedExpiration || (now > musicFeedExpiration))) {
                const { data } = await api.music.getFeed(profile)
                setMusicFeed(postProcessHomefeed(data.filter(item => item.response_type !== 'news_feed')))
                now.setHours(now.getHours() + 3)
                setMusicFeedExpiration(now)
            }
        }
        setLoading(true)
        loadFeed().then(() => setLoading(false))
    }, [profile, currentActivity, setSelectedContent, setCategories,
        setHomeFeed, homeFeedExpiration, setHomeFeedExpiration, setHomePosition,
        setMusicFeed, musicFeedExpiration, setMusicFeedExpiration,
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
                            <ConfirmExitPanel onCancel={toggleShowFullToolbar} />
                        </ActivityViews>
                    }
                </Cell>
            </Row>
            <Transition visible={showFullToolbar} type='slide' direction='right'>
                <FloatingLayerFix open={showFullToolbar} onDismiss={toggleShowFullToolbar}
                    style={{
                        background: 'linear-gradient(to right, #000000 20%, rgba(0, 0, 0, 0))',
                        paddingLeft: '0.6rem',
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
