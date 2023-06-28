import { useCallback, } from 'react'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import { Panel } from '@enact/moonstone/Panels'
import $L from '@enact/i18n/$L'

import Alert from '../components/Alert'
import { pathState, initScreenState } from '../recoilConfig'
import back from '../back'
import utils from '../utils'


const ConfirmExitPanel = ({ onCancel, ...rest }) => {

    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {String} */
    const initScreen = useRecoilValue(initScreenState)

    const hideCloseApp = useCallback(() => {
        if (onCancel) {
            onCancel()
        } else {
            back.pushHistory({ doBack: () => setPath('/askClose') })
            setPath(initScreen)
        }
    }, [setPath, initScreen, onCancel])

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
