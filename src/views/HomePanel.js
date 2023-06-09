import { useEffect, useState, useCallback } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import { Panel } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { currentProfileState } from '../recoilConfig'
import HomeToolbar, { TOOLBAR_INDEX } from '../components/HomeToolbar'
import Home from '../components/Home'
import api from '../api'


const HomePanel = (props) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[number, Function]} */
    const [currentActivity, setCurrentActivity] = useState(TOOLBAR_INDEX.home.index)
    /** @type {Function} */
    const setActivity = useCallback(({ index }) => { setCurrentActivity(index) }, [setCurrentActivity])


    useEffect(() => {
        const loadData = async () => {
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
                    <Home currentActivity={currentActivity} />
                </Cell>
            </Row>
        </Panel>
    )
}

export default HomePanel
