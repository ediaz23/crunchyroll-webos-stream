
import { useCallback } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import { useSetRecoilState } from 'recoil'

import { $L } from '../../hooks/language'
import { useNavigate } from '../../hooks/navigate'
import { contactBtnState } from '../../recoilConfig'


/**
 * @param {{origin: String}}
 */
const ContactMe = () => {
    const { goTo } = useNavigate()
    /** @type {Function} */
    const setContactBtn = useSetRecoilState(contactBtnState)

    const contactMe = useCallback(() => {
        setContactBtn(false)
        goTo('/contact')
    }, [setContactBtn, goTo])


    return (
        <IconButton size="small" onClick={contactMe} tooltipText={$L('About Me?')}>
            info
        </IconButton>
    )
}

export default ContactMe
