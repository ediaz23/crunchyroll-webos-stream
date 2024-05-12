
import { useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'

import { $L } from '../../hooks/language'
import HomeContentBanner from '../home/ContentBanner'
import PopupMessage from '../Popup'



const ContentInfo = ({ content }) => {
    /** @type {[Function, Function]} */
    const [onShowSubPopup, setOnShowSubPopup] = useState(undefined)

    return (
        <>
            <PopupMessage setShowPopup={setOnShowSubPopup}>
                <HomeContentBanner content={content} noCategory spotlightDisabled />
            </PopupMessage>
            <IconButton
                backgroundOpacity="lightTranslucent"
                onClick={onShowSubPopup}
                tooltipText={$L('Content Info')}>
                info
            </IconButton>
        </>
    )
}

export default ContentInfo
