import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
import { useSetRecoilState } from 'recoil'

import { pathState } from '../recoilConfig'
import api from '../api'


const ContactMePanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)

    const accept = useCallback(async () => {
        await api.config.setNextContactDate()
        setPath('/login')
    }, [setPath])

    /** @todo terminar */
    return (
        <Panel {...rest}>
            <Header title="Contact me" />
            <Button onClick={accept}>Click me</Button>
        </Panel>
    )
}

export default ContactMePanel
