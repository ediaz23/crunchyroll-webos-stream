
import { useCallback, useState, useEffect, useMemo } from 'react'
import Popup, { PopupBase } from '@enact/moonstone/Popup'
import Skinnable from '@enact/moonstone/Skinnable'
import Heading from '@enact/moonstone/Heading'
import Spotlight from '@enact/spotlight'

import PropTypes from 'prop-types'

import back from '../back'


export const PopupBaseSkin = Skinnable({ defaultSkin: 'dark' }, PopupBase)

const PopupMessage = ({ type, show, children, setShowPopup: callBack, onClose }) => {
    /** @type {[Boolean, Function]} */
    const [showPopup, setShowPopup] = useState(false)
    /** @type {Object} */
    const styleObj = useMemo(() => {
        let style = {}
        if (type === 'error') {
            style = { color: 'red' }
        } else if (type === 'warn') {
            style = { color: 'yellow' }
        } else if (type === 'info') {
            style = { color: 'green' }
        }
        return style
    }, [type])

    /** @type {Function} */
    const onHideSubPopup = useCallback(() => {
        back.doBack()
        if (onClose) {
            onClose()
        }
        setTimeout(() => Spotlight.focus(), 100)
    }, [onClose])

    const togglePopup = useCallback((newVal) => {
        setShowPopup(oldVar => {
            if (newVal !== undefined && oldVar === newVal) {
                return oldVar
            }
            if (oldVar) {
                back.doBack()
            } else {
                back.pushHistory({ doBack: () => { setShowPopup(false) } })
            }
            return !oldVar
        })
    }, [])

    useEffect(() => {
        if (callBack) {
            callBack(() => togglePopup)
        }
    }, [callBack, togglePopup])

    useEffect(() => {
        if (show !== undefined) {
            togglePopup(show)
        }
    }, [show, togglePopup])

    return (
        <Popup
            onClose={onHideSubPopup}
            open={showPopup}
            showCloseButton
            scrimType='transparent'>
            {typeof children === 'string' || children instanceof String ?
                <Heading size='large' spacing="small" style={styleObj}>
                    {children}
                </Heading>
                :
                children
            }
        </Popup>
    )
}

PopupMessage.propTypes = {
    show: PropTypes.bool,
    children: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    type: PropTypes.oneOf(['info', 'error', 'warn']),
    setShowPopup: PropTypes.func,
    onClose: PropTypes.func,
}

export default PopupMessage
