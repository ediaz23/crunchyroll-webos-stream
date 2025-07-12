
import { useCallback, useEffect } from 'react'
import { Row } from '@enact/ui/Layout'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
import BodyText from '@enact/moonstone/BodyText'
import Spotlight from '@enact/spotlight'

import { useSetRecoilState } from 'recoil'

import { $L } from '../hooks/language'
import { pathState, contactBtnState } from '../recoilConfig'
import api from '../api'


const WarningPanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setContactBtn = useSetRecoilState(contactBtnState)

    const accept = useCallback(async () => {
        await api.config.setInstalled()
        setContactBtn(true)
        setPath('/login')
    }, [setPath, setContactBtn])

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.querySelector('#accept')) {
                Spotlight.focus('#accept')
                clearInterval(interval)
            }
        })
        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <Panel {...rest}>
            <Header title={$L('Warning')}>
                <Button id="accept" onClick={accept}>{$L('Accept')}</Button>
            </Header>
            <Row align='center center'>
                <BodyText style={{ fontSize: '2rem', lineHeight: '3rem', textAlign: 'justify' }}>
                    {$L(`Crunchyroll™ is a registered trademark of the Sony Pictures Entertainment Inc.
 This project is not affiliated with Crunchyroll, Team Crunchyroll, or the Sony Pictures Entertainment Inc.
 Usage of this application may potentially violate Crunchyroll's terms of service.
 The application is provided "as is" and the developer assumes no responsibility for any errors or
 issues that may arise during use. Use at your own risk.`)}
                </BodyText>
            </Row>
        </Panel>
    )
}

export default WarningPanel
