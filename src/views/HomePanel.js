import { useEffect, useState, useCallback } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import { Panel, ActivityPanels } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { currentProfileState } from '../recoilConfig'
import HomeToolbar, { TOOLBAR_INDEX } from '../components/HomeToolbar'
import HomeFeed from '../components/HomeFeed'
import api from '../api'


const HomePanel = (props) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Array<Object>, Function]} */
    const [homefeed, setHomefeed] = useState([])
    /** @type {[number, Function]} */
    const [currentActivity, setCurrentActivity] = useState(TOOLBAR_INDEX.home.index)
    /** @type {Function} */
    const setActivity = useCallback(({ index }) => { setCurrentActivity(index) }, [setCurrentActivity])

    useEffect(() => {
        const loadData = async () => {
            const { data } = await api.getHomeFeed(profile)
            setHomefeed(data.filter(item => item.response_type !== 'news_feed'))
        }
        loadData()
    }, [profile])

    return (
        <Panel {...props}>
            <Row style={{ height: '100%' }}>
                <Cell shrink>
                    <HomeToolbar currentIndex={currentActivity} hideText />
                </Cell>
                <Cell grow>
                    <ActivityPanels index={currentActivity} noCloseButton>
                        <HomeFeed profile={profile} homefeed={homefeed} />
                    </ActivityPanels>
                </Cell>
            </Row>
        </Panel>
    )
}

export default HomePanel
