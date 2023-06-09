import { useCallback } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import { useSetRecoilState } from 'recoil'
import PropTypes from 'prop-types'

import $L from '@enact/i18n/$L'

import { pathState } from '../recoilConfig'
import back from '../back'


/**
 * @param {{origin: String}}
 */
const ContactMe = ({ origin }) => {

    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)

    const contactMe = useCallback(() => {
        const newOrigin = origin.startsWith('/') ? origin : `/${origin}`
        back.pushHistory({ doBack: () => { setPath(newOrigin) } })
        setPath('/contact')
    }, [setPath, origin])


    return (
        <IconButton size="small" onClick={contactMe} tooltipText={$L('About Me?')}>
            info
        </IconButton>
    )
}

ContactMe.propTypes = {
    origin: PropTypes.string.isRequired
}

export default ContactMe
