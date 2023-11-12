
import { useState, useCallback, useEffect } from 'react'
import { Panel } from '@enact/moonstone/Panels'
import $L from '@enact/i18n/$L'

import { useRecoilValue } from 'recoil'

import { currentProfileState, selectedContentState } from '../recoilConfig'
import Series from '../components/series/Series'
import Alert from '../components/Alert'
import logger from '../logger'
import back from '../back'


const ContentPanel = ({ ...rest }) => {
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {Object} */
    const content = useRecoilValue(selectedContentState)
    /** @type {[Boolean, Function]} */
    const [showError, setShowError] = useState(false)

    const onAccept = useCallback(() => {
        back.doBack()
    }, [])

    useEffect(() => {
        if (content && !['series'].includes(content.type)) {
            logger.error(JSON.stringify(content, null, '    '))
            setShowError(true)
        }
    }, [content, setShowError])

    return (
        <Panel {...rest}>
            {content.type === 'series' && <Series series={content} profile={profile} />}
            <Alert open={showError}
                title={$L('Content not supported?')}
                message={$L('Please contact to developer or create a issues')}
                onAccept={onAccept}
            />
        </Panel>
    )
}

export default ContentPanel
