import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
import { useSetRecoilState } from 'recoil'

import { pathState } from '../recoilConfig'
import api from '../api'

/**
 * Show thats no an official app
 */
const WarningPanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)

    const accept = useCallback(async () => {
        await api.setInstalled()
        setPath('/login')
    }, [setPath])

    /** @todo */
    return (
        <Panel {...rest}>
            <Header title="Warning" />
            <Button onClick={accept}>Click me</Button>
        </Panel>
    )
}

export default WarningPanel
