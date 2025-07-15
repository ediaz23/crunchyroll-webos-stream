
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { Panel } from '@enact/moonstone/Panels'
import PropTypes from 'prop-types'

import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import Alert from '../components/Alert'
import { autoLoginState } from '../recoilConfig'


const ErrorPanel = ({ message, closeErrorPanel, onlyClose, ...rest }) => {
    const { jumpTo } = useNavigate()
    /** @type {Function} */
    const setAutoLoginState = useSetRecoilState(autoLoginState)

    const onAccept = useCallback(() => {
        if (onlyClose) {
            closeErrorPanel()
        } else {
            setAutoLoginState(false)
            jumpTo('/login')
            closeErrorPanel()
        }
    }, [setAutoLoginState, closeErrorPanel, onlyClose, jumpTo])

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
    onlyClose: PropTypes.bool,
}

export default ErrorPanel
