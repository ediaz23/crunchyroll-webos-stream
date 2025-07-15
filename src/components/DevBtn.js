
import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import Icon from '@enact/moonstone/Icon'

import { useNavigate } from '../hooks/navigate'

const DevBtn = () => {
    const { goTo } = useNavigate()
    const onClick = useCallback(() => {
        goTo('/developer')
    }, [goTo])

    return (
        <Button onClick={onClick}>
            <Icon style={{ marginRight: '0.5rem' }}>
                gear
            </Icon>
            {'Dev Opt'}
        </Button>
    )
}

export default DevBtn
