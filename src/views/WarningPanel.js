import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
import { useSetRecoilState } from 'recoil'

import { pathState } from '../recoilConfig'
import api from '../api'

/**
 * Show thats not an official app
 * @todo
 */
const WarningPanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)

    const accept = useCallback(async () => {
        await api.config.setInstalled()
        setPath('/login')
    }, [setPath])

    /** @todo */
    return (
        <Panel {...rest}>
            <Header title="Warning Just click" />
            <Button onClick={accept}>Click me</Button>
        </Panel>
    )
}

export default WarningPanel
