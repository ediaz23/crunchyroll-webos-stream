
import { useEffect, useState, useCallback } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import Transition from '@enact/ui/Transition'
import { Panel } from '@enact/moonstone/Panels'

import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'

import {
    currentProfileState, homeFeedState, processedFeedState,
    selectedContentState, homefeedReadyState
} from '../recoilConfig'
import HomeToolbar, { TOOLBAR_INDEX, HomeToolbarSpotlight } from '../components/home/Toolbar'
import HomeFeed from '../components/home/Feed'
import ContentGrid from '../components/grid/ContentGrid'
import FloatingLayerFix from '../patch/FloatingLayer'
import api from '../api'
import ContactMePanel from './ContactMePanel'
import ConfirmExitPanel from './ConfirnExitPanel'


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
    for (const item of feed) {
        if (item.resource_type === 'panel') {
            if (panelObject.panels.length === 0) {
                mergedFeed.push(panelObject)
            }
            panelObject.panels.push(item)
        } else if (item.resource_type === 'in_feed_banner') {
            if (bannerObject.panels.length === 0) {
                mergedFeed.push(bannerObject)
            }
            bannerObject.panels.push(item)
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
    /** @type {[Array<Object>, Function]} */
    const [homefeed, setHomefeed] = useRecoilState(homeFeedState)
    /** @type {[Number, Function]} */
    const [currentActivity, setCurrentActivity] = useState(TOOLBAR_INDEX.home.index)
    /** @type {[Array<Object>, Function]} */
    const [showFullToolbar, setShowFullToolbar] = useState(false)
    /** @type {Boolean} */
    const homefeedReady = useRecoilValue(homefeedReadyState)
    /** @type {Function} */
    const setProcessedFeed = useSetRecoilState(processedFeedState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)

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
        if (homefeed.length === 0) {
            api.discover.getHomeFeed(profile).then(({ data }) => {
                /** @type {Array} */
                const filterFeed = data.filter(item => item.response_type !== 'news_feed')
                setSelectedContent(null)
                setProcessedFeed(new Array(filterFeed.length))
                setHomefeed(postProcessHomefeed(filterFeed))
            })
        }
    }, [profile, homefeed, setHomefeed, setProcessedFeed, setSelectedContent])

    return (
        <Panel {...props}>
            <Row style={{ height: '100%' }}>
                <Cell shrink>
                    <HomeToolbar currentIndex={currentActivity}
                        onFocus={showToolbar} hideText />
                </Cell>
                <Cell grow>
                    <ActivityViews index={currentActivity}>
                        <HomeFeed profile={profile} homefeed={homefeed} />
                        <ContentGrid profile={profile} contentKey='simulcast' />
                        <ContentGrid profile={profile} contentKey='search' />
                        <ContentGrid profile={profile} contentKey='series' contentType='series' />
                        <ContentGrid profile={profile} contentKey='movies' contentType='movie_listing' />
                        <p>music</p>
                        <p>categories</p>
                        <p>My list</p>
                        <ContactMePanel />
                        <ConfirmExitPanel onCancel={toggleShowFullToolbar} />
                    </ActivityViews>
                </Cell>
            </Row>
            <Transition visible={showFullToolbar} type='slide' direction='right'>
                <FloatingLayerFix open={showFullToolbar} onDismiss={toggleShowFullToolbar}
                    style={{
                        background: 'linear-gradient(to right, #000000 20%, rgba(0, 0, 0, 0))',
                        paddingLeft: '2rem',
                    }}>
                    <HomeToolbarSpotlight currentIndex={currentActivity}
                        onClick={setActivity}
                        onLeave={toggleShowFullToolbar}
                        autoFocus />
                </FloatingLayerFix>
            </Transition>
        </Panel>
    )
}

export default HomePanel
