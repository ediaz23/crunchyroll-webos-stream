
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import { PopupBase } from '@enact/moonstone/Popup'
import FloatingLayer from '@enact/ui/FloatingLayer'
import Skinnable from '@enact/moonstone/Skinnable'

import { $L } from '../../hooks/language'
import HomeContentBanner from '../home/ContentBanner'
import back from '../../back'


const PopupBaseSkin = Skinnable({ defaultSkin: 'dark' }, PopupBase)

const ContentInfo = ({ content }) => {
    /** @type {[Boolean, Function]} */
    const [showSubPopup, setShowSubPopup] = useState(false)

    /** @type {Function} */
    const onHideSubPopup = useCallback(() => { back.doBack() }, [])

    /** @type {Function} */
    const onShowSubPopup = useCallback(() => {
        setShowSubPopup(oldVar => {
            if (oldVar) {
                back.doBack()
            } else {
                back.pushHistory({ doBack: () => { setShowSubPopup(false) } })
            }
            return !oldVar
        })
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
