
import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import Icon from '@enact/moonstone/Icon'

import { useSetRecoilState } from 'recoil'

import { pathState } from '../recoilConfig'
import back from '../back'

const DevBtn = () => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    const onClick = useCallback(() => {
        setPath(bak => {
            back.pushHistory({
                doBack: () => {
                    setPath(bak)
                }
            })
            return '/developer'
        })
    }, [setPath])

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
