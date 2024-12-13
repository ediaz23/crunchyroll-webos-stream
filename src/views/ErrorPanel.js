
import { useEffect, useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { Panel } from '@enact/moonstone/Panels'
import PropTypes from 'prop-types'

import { $L } from '../hooks/language'
import Alert from '../components/Alert'
import { pathState, initScreenState, autoLoginState } from '../recoilConfig'
import back from '../back'


const ErrorPanel = ({ message, closeErrorPanel, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setInitScreenState = useSetRecoilState(initScreenState)
    /** @type {Function} */
    const setAutoLoginState = useSetRecoilState(autoLoginState)


    const onAccept = useCallback(() => {
        back.pushHistory({ doBack: () => setPath('/askClose') })
        setAutoLoginState(false)
        setInitScreenState('/login')
        setPath('/login')
        closeErrorPanel()
    }, [setAutoLoginState, setInitScreenState, setPath, closeErrorPanel])

    useEffect(() => { back.cleanHistory() }, [])

    return (
        <Panel {...rest}>
            <Alert open
                title={$L('An error occurred')}
                message={message}
                onAccept={onAccept}
            />
        </Panel>
    )
}

ErrorPanel.propTypes = {
    message: PropTypes.string.isRequired,
    closeErrorPanel: PropTypes.func.isRequired,
}

export default ErrorPanel
