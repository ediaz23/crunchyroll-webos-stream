
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import Button from '@enact/moonstone/Button'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import { useNavigate } from '../../hooks/navigate'
import Alert from '../Alert'
import api from '../../api'


const Logout = ({ text }) => {
    const { jumpTo, pushHistory, goBack } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [askExit, setAskExit] = useState(false)

    const doLogout = useCallback(async () => {
        await api.auth.logout()
        jumpTo('/login')
    }, [jumpTo])

    const askLogout = useCallback(() => {
        pushHistory(() => { setAskExit(false) })
        setAskExit(true)
    }, [pushHistory, setAskExit])

    return (
        <>
            {text &&
                <Button onClick={askLogout}>{$L('Logout')}</Button>
            }
            {!text &&
                <IconButton size="small" onClick={askLogout} tooltipText={$L('Logout')}>
                    arrowshrinkright
                </IconButton>
            }
            <Alert open={askExit}
                title={$L('Logout')}
                message={$L('Are you sure you want to logout?')}
                onAccept={doLogout}
                onCancel={goBack} />
        </>
    )
}

Logout.propTypes = {
    text: PropTypes.string,
}

export default Logout
