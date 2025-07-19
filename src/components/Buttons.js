
import { useCallback, useState } from 'react'
import Button from '@enact/moonstone/Button'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import { useSetRecoilState } from 'recoil'

import Alert from './Alert'
import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import { contactBtnState } from '../recoilConfig'
import api from '../api'


/**
 * @typedef {Object} AppButtonPropsBase
 * @property {'full'|'short'} [mode]
 * @property {String} icon
 * @property {Function} onClick
 *
 * @param {AppButtonPropsBase & import('@enact/moonstone/IconButton').IconButtonProps} obj
 */
export const AppIconButton = ({ mode = 'short', onClick, tooltipText, icon, ...rest }) => {

    return (<>
        {mode === 'full' &&
            <Button onClick={onClick}>
                <Icon style={{ marginRight: '0.5rem' }}>
                    {icon}
                </Icon>
                {tooltipText}
            </Button>
        }
        {mode === 'short' &&
            <IconButton
                size="small"
                onClick={onClick}
                tooltipText={tooltipText}
                tooltipRelative
                {...rest}>
                {icon}
            </IconButton>
        }
    </>)
}


export const DevBtn = () => {
    const { goTo } = useNavigate()
    const onClick = useCallback(() => {
        goTo('/developer')
    }, [goTo])

    return (
        <AppIconButton
            mode='full'
            onClick={onClick}
            tooltipText='Dev'
            icon='gear'
        />
    )
}

export const AppConfigBtn = ({ mode = 'short' }) => {
    const { goTo } = useNavigate()
    const onClick = useCallback(() => {
        goTo('/appConfig')
    }, [goTo])

    return (
        <AppIconButton
            mode={mode}
            onClick={onClick}
            tooltipText={$L('Config')}
            icon='gear'
        />
    )
}

export const ContactMeBtn = () => {
    const { goTo } = useNavigate()
    /** @type {Function} */
    const setContactBtn = useSetRecoilState(contactBtnState)

    const contactMe = useCallback(() => {
        setContactBtn(false)
        goTo('/contact')
    }, [setContactBtn, goTo])

    return (
        <AppIconButton
            mode='short'
            onClick={contactMe}
            tooltipText={$L('About Me?')}
            icon='info'
        />
    )
}

export const LogoutBtn = () => {
    const { jumpTo, pushHistory, goBack } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [askExit, setAskExit] = useState(false)

    const doLogout = useCallback(async () => {
        await api.auth.logout()
        jumpTo('/login')
    }, [jumpTo])

    const askLogout = useCallback(() => {
        pushHistory(() => { setAskExit(false) })
        setAskExit(true)
    }, [pushHistory, setAskExit])

    return (
        <>
            <AppIconButton
                mode='short'
                onClick={askLogout}
                tooltipText={$L('Logout')}
                icon='arrowshrinkright'
            />
            <Alert open={askExit}
                title={$L('Logout')}
                message={$L('Are you sure you want to logout?')}
                onAccept={doLogout}
                onCancel={goBack} />
        </>
    )
}
