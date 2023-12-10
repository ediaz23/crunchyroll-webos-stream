
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import { PopupBase } from '@enact/moonstone/Popup'
import FloatingLayer from '@enact/ui/FloatingLayer'
import Skinnable from '@enact/moonstone/Skinnable'
import $L from '@enact/i18n/$L'

import HomeContentBanner from '../home/ContentBanner'


const PopupBaseSkin = Skinnable({ defaultSkin: 'dark' }, PopupBase)

const ContentInfo = ({ content }) => {
    /** @type {[Boolean, Function]} */
    const [showSubPopup, setShowSubPopup] = useState(false)
    const onHideSubPopup = useCallback(() => {
        setShowSubPopup(false)
    }, [setShowSubPopup])
    const onShowSubPopup = useCallback(() => {
        setShowSubPopup(oldVar => !oldVar)
    }, [setShowSubPopup])

    return (
        <>
            <FloatingLayer open={showSubPopup}
                onDismiss={onHideSubPopup}>
                <PopupBaseSkin open={showSubPopup}
                    onCloseButtonClick={onHideSubPopup}
                    showCloseButton>
                    <HomeContentBanner content={content} noCategory />
                </PopupBaseSkin>
            </FloatingLayer>
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
