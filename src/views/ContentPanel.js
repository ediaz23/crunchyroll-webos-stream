

import { Panel } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { currentProfileState, selectedContentState } from '../recoilConfig'
import Series from '../components/series/Series'


const ContentPanel = ({ ...rest }) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {Object} */
    const content = useRecoilValue(selectedContentState)

    return (
        <Panel {...rest}>
            {content.type === 'series' && <Series series={content} profile={profile} />}
        </Panel>
    )
}

export default ContentPanel
