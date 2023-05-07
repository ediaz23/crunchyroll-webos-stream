import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
import { useSetRecoilState } from 'recoil'

import { pathState } from '../recoilConfig'
//import api from '../api'

const LoginPanel = (props) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)

    const accept = useCallback(async () => {
        //        setPath('/profiles')
        setPath('/contact')
        //        await api.setInstalled()
    }, [setPath])

    return (
        <Panel {...props}>
            <Header title="Login" />
            <Button onClick={accept}>Click me</Button>
        </Panel>
    )
}

export default LoginPanel