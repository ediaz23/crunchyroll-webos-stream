
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'

import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'

import { currentProfileState, categoriesState, homeViewReadyState } from '../recoilConfig'
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
import { useViewBackup } from '../hooks/viewBackup'


const ActivityViews = ({ index, children }) => (children[index])

const HomePanel = (props) => {
    const [backState, viewBackupRef] = useViewBackup('homePanel')
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Number, Function]} */
    const [currentActivity, setCurrentActivity] = useState(backState?.currentActivity || 0)
    /** @type {[Array<Object>, Function]} */
    const [showFullToolbar, setShowFullToolbar] = useState(false)
    /** @type {[Boolean, Function]} */
    const [homeViewReady, setHomeViewReady] = useRecoilState(homeViewReadyState)
    /** @type {Function} */
    const setCategories = useSetRecoilState(categoriesState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    /** @type {[{id: Number, items: Array<import('../hooks/homefeedWorker').HomefeedItem>}, Function]} */
    const [homeFeed, setHomeFeed] = useState({ id: Date.now(), items: [] })

    /** @type {[{id: Number, items: Array<Object>}, Function]} */
    const [musicFeed, setMusicFeed] = useState({ id: Date.now(), items: [] })
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
            if (currentActivity === 0) {
                const [homeFeedCache, categoriesCache] = await Promise.all([
                    api.utils.getCustomCache('/homeFeed'),
                    api.utils.getCustomCache('/categories')
                ])

                if (homeFeedCache && categoriesCache) {
                    setHomeFeed(homeFeedCache)
                    setCategories(categoriesCache)
                } else {
                    const homeFeedProm = api.discover.getNewHomeFeed(profile).then(processHomeFeed)
                    const categoriesProm = api.discover.getCategories(profile).then(({ data: categs }) => {
                        return [
                            { id: 'all', title: $L('All') },
                            ...categs.map(cat => ({ id: cat.id, title: cat.localization.title }))
                        ]
                    })

                    const [newHomeFeed, categories] = await Promise.all([homeFeedProm, categoriesProm])
                    setHomeFeed(newHomeFeed)
                    setCategories(categories)

                    api.utils.saveCustomCache('/homeFeed', newHomeFeed, 3 * 60 * 60)  // 3h
                    api.utils.saveCustomCache('/categories', categories, 3 * 60 * 60) // 3h
                }
            } else if (currentActivity === 5) {
                const musicFeedCache = await api.utils.getCustomCache('/musicFeed')
                if (musicFeedCache) {
                    setMusicFeed(musicFeedCache)
                } else {
                    const newMusicFeed = await api.music.getFeed(profile).then(processHomeFeed)
                    setMusicFeed(newMusicFeed)
                    api.utils.saveCustomCache('/musicFeed', { newMusicFeed }, 3 * 60 * 60) // 3h
                }
            }
        }
        setLoading(true)
        loadFeed().then(() => currentActivity != null && setLoading(false))
    }, [profile, currentActivity, setCategories, setHomeFeed, setMusicFeed, processHomeFeed])

    useEffect(() => {
        return () => {
            setHomeViewReady(false)
        }
    }, [setHomeViewReady])

    /** backup all state to restore later */
    viewBackupRef.current = { currentActivity }

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
                                feedType='home' />
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
                                title={toolbarList[currentActivity].label}
                                musicFeed={musicFeed} />
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
