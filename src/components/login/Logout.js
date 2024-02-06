
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import Button from '@enact/moonstone/Button'
import { useSetRecoilState } from 'recoil'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import Alert from '../Alert'
import { pathState, initScreenState } from '../../recoilConfig'
import api from '../../api'
import back from '../../back'


const Logout = ({ text }) => {
    /** @type {[Boolean, Function]} */
    const [askExit, setAskExit] = useState(false)
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setInitScreenState = useSetRecoilState(initScreenState)

    const doLogout = useCallback(async () => {
        await api.auth.logout()
        back.cleanHistory()
        setInitScreenState('/login')
        setPath('/login')
    }, [setInitScreenState, setPath])

    const askLogout = useCallback(() => {
        back.pushHistory({ doBack: () => { setAskExit(false) } })
        setAskExit(true)
    }, [setAskExit])

    const cancelLogout = useCallback(() => {
        back.doBack()
    }, [])

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
                onCancel={cancelLogout} />
        </>
    )
}

Logout.propTypes = {
    text: PropTypes.string,
}

export default Logout
