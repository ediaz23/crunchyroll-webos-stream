

import { Panel } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { currentProfileState, selectedContentState } from '../recoilConfig'
import ContentSerie from '../components/ContentSerie'


const ContentPanel = (rest) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {Object} */
    const content = useRecoilValue(selectedContentState)

    return (
        <Panel {...rest}>
            {content.type === 'series' && <ContentSerie content={content} profile={profile} />}
        </Panel>
    )
}

export default ContentPanel
