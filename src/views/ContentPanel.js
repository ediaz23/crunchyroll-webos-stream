
import { useState, useCallback, useEffect } from 'react'
import { Panel } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { $L } from '../hooks/language'
import { currentProfileState, selectedContentState } from '../recoilConfig'
import ContentDetail from '../components/content/ContentDetail'
import Artist from '../components/artist/Artist'
import Alert from '../components/Alert'
import logger from '../logger'
import back from '../back'


const ContentPanel = ({ ...rest }) => {
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {Object} */
    const content = useRecoilValue(selectedContentState)
    /** @type {[Boolean, Function]} */
    const [showError, setShowError] = useState(false)

    const onAccept = useCallback(() => {
        back.doBack()
    }, [])

    useEffect(() => {
        if (content && !['series', 'musicArtist', 'movie_listing'].includes(content.type)) {
            logger.error(JSON.stringify(content, null, '    '))
            setShowError(true)
        }
    }, [content, setShowError])

    return (
        <Panel {...rest}>
            {content.type === 'series' && <ContentDetail profile={profile} content={content} />}
            {content.type === 'movie_listing' && <ContentDetail profile={profile} content={content} />}
            {content.type === 'musicArtist' && <Artist profile={profile} artist={content} />}
            <Alert open={showError}
                title={$L('Content not supported?')}
                message={$L('Please contact to developer or create a issues')}
                onAccept={onAccept}
            />
        </Panel>
    )
}

export default ContentPanel
