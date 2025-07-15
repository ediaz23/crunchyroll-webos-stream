
import { useCallback, } from 'react'
import { useRecoilValue } from 'recoil'
import { Panel } from '@enact/moonstone/Panels'

import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import Alert from '../components/Alert'
import { initScreenState } from '../recoilConfig'
import utils from '../utils'


const ConfirmExitPanel = ({ onCancel, ...rest }) => {
    const { jumpTo } = useNavigate()
    /** @type {String} */
    const initScreen = useRecoilValue(initScreenState)

    const hideCloseApp = useCallback(() => {
        if (onCancel) {
            onCancel()
        } else {
            jumpTo(initScreen)
        }
    }, [initScreen, onCancel, jumpTo])

    const closeApp = useCallback(() => {
        if (utils.isTv()) {
            window.close()
        } else {
            hideCloseApp()
        }
    }, [hideCloseApp])

    return (
        <Panel {...rest}>
            <Alert open
                title={$L('Exit application?')}
                onCancel={hideCloseApp}
                onAccept={closeApp}
            />
        </Panel>
    )
}

export default ConfirmExitPanel
