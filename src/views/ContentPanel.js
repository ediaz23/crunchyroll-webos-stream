
import { useState, useEffect } from 'react'
import { Panel } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import { currentProfileState, selectedContentState } from '../recoilConfig'
import ContentDetail from '../components/content/ContentDetail'
import Artist from '../components/artist/Artist'
import Alert from '../components/Alert'
import logger from '../logger'


const ContentPanel = ({ ...rest }) => {
    const { goBack: onAccept } = useNavigate()
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {Object} */
    const content = useRecoilValue(selectedContentState)
    /** @type {[Boolean, Function]} */
    const [showError, setShowError] = useState(false)

    useEffect(() => {
        if (content && !['series', 'musicArtist', 'movie_listing'].includes(content.type)) {
            logger.error(JSON.stringify(content, null, '    '))
            setShowError(true)
        }
    }, [content, setShowError])

    return (
        <Panel {...rest}>
            {['series', 'movie_listing'].includes(content.type) &&
                <ContentDetail
                    profile={profile}
                    content={content}
                    key={content.id} />
            }
            {'musicArtist' === content.type &&
                <Artist
                    profile={profile}
                    artist={content}
                    key={content.id} />
            }
            <Alert open={showError}
                title={$L('Content not supported?')}
                message={$L('Please contact to developer or create an issues')}
                onAccept={onAccept}
            />
        </Panel>
    )
}

export default ContentPanel
