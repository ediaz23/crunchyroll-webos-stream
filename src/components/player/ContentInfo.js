
import { useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ri from '@enact/ui/resolution'

import { $L } from '../../hooks/language'
import HomeContentBanner from '../home/ContentBanner'
import PopupMessage from '../Popup'



const ContentInfo = ({ content }) => {
    /** @type {[Function, Function]} */
    const [onShowSubPopup, setOnShowSubPopup] = useState(undefined)

    return (
        <>
            <PopupMessage setShowPopup={setOnShowSubPopup}>
                <div style={{ height: ri.scale(400) }}>
                    <HomeContentBanner content={content} noCategory spotlightDisabled />
                </div>
            </PopupMessage>
            <IconButton
                backgroundOpacity="lightTranslucent"
                onClick={onShowSubPopup}
                tooltipText={$L('Content Info')}
                tooltipRelative>
                info
            </IconButton>
        </>
    )
}

export default ContentInfo
