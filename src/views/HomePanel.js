
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Transition from '@enact/ui/Transition'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'

import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'

import {
    currentProfileState, homefeedReadyState, homeIndexState, selectedContentState,
    homeFeedState, homeFeedExpirationState,
    musicFeedState, musicFeedExpirationState,
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

const ActivityViews = ({ index, children }) => (children[index])

const HomePanel = (props) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Number, Function]} */
    const [currentActivity, setCurrentActivity] = useRecoilState(homeIndexState)
    /** @type {[Array<Object>, Function]} */
    const [showFullToolbar, setShowFullToolbar] = useState(false)
    /** @type {[Boolean, Function]} */
    const [homeFeedReady, setHomeFeedReady] = useRecoilState(homefeedReadyState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)

    /** @type {[Array<Object>, Function]} */
    const [homeFeed, setHomeFeed] = useRecoilState(homeFeedState)
    /** @type {[Date, Function]} */
    const [homeFeedExpiration, setHomeFeedExpiration] = useRecoilState(homeFeedExpirationState)

    /** @type {[Array<Object>, Function]} */
    const [musicFeed, setMusicFeed] = useRecoilState(musicFeedState)
    /** @type {[Date, Function]} */
    const [musicFeedExpiration, setMusicFeedExpiration] = useRecoilState(musicFeedExpirationState)
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
        if (homeFeedReady) {
            ev.target.blur()
            toggleShowFullToolbar()
        }
    }, [toggleShowFullToolbar, homeFeedReady])

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
                setSelectedContent(null)
            }
            if (currentActivity === 5 && (!musicFeedExpiration || (now > musicFeedExpiration))) {
                const { data } = await api.music.getFeed(profile)
                setMusicFeed(postProcessHomefeed(data.filter(item => item.response_type !== 'news_feed')))
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
        setHomeFeed, homeFeedExpiration, setHomeFeedExpiration,
        setMusicFeed, musicFeedExpiration, setMusicFeedExpiration,
    ])

    useEffect(() => {
        return () => {
            setHomeFeedReady(false)
        }
    }, [setHomeFeedReady])

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
                            <HomeFeed profile={profile}
                                homeFeed={homeFeed}
                                setHomeFeed={setHomeFeed} />
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
                            <MusicBrowse profile={profile}
                                contentKey='music'
                                title={toolbarList[currentActivity].label}
                                musicFeed={musicFeed}
                                setMusicFeed={setMusicFeed} />
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
