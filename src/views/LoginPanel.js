
import { useCallback, useEffect, useState, useRef } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import { Header, Panel } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'
import Button from '@enact/moonstone/Button'

import { useSetRecoilState, useRecoilState } from 'recoil'

import { LoginWithEmail, LoginWithCode, LoginWithQR } from '../components/login/Login'
import { ContactMeBtn, AppConfigBtn } from '../components/Buttons'
import PopupMessage from '../components/Popup'
import { autoLoginState, isPremiumState } from '../recoilConfig'
import api from '../api'
import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import logger from '../logger'


const ActivityViews = ({ index, children }) => children[index]

const LoginPanel = ({ ...rest }) => {
    const { jumpTo } = useNavigate()
    /** @type {Function} */
    const setPremiumState = useSetRecoilState(isPremiumState)
    /** @type {[Boolean, Function]}  */
    const [autoLogin, setAutoLogin] = useRecoilState(autoLoginState)
    /** @type {[String, Function]}  */
    const [message, setErrorMessage] = useState('')
    /** @type {[Number, Function]} */
    const [currentIndex, setCurrentIndex] = useState(0)
    /** @type {[String, Function]} */
    const [deviceCode, setDeviceCode] = useState(null)
    /** @type {{current: import('crunchyroll-js-api').Types.DeviceCode}} */
    const deviceRef = useRef(null)

    /** @type {Function} */
    const makeLogin = useCallback(async () => {
        await api.auth.login()
        const account = await api.account.getAccount()
        const benefits = await api.subscription.getUserBenefits(account)
        for (const item of benefits.items) {
            if (item.benefit === 'cr_premium') {
                setPremiumState(true)
                break
            }
        }
        setAutoLogin(true)
        jumpTo('/profiles')
    }, [setAutoLogin, setPremiumState, jumpTo])

    /** @type {Function} */
    const setView = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setCurrentIndex(parseInt(target.dataset.index))
    }, [])

    /** @type {Function} */
    const onError = useCallback(error => {
        logger.error(error)
        setErrorMessage(error.message || error.code)
        deviceRef.current = null
        setCurrentIndex(0)
    }, [setErrorMessage, setCurrentIndex])

    useEffect(() => {
        let timeout = null
        let interval = null
        if (currentIndex >= 1) {
            setDeviceCode(null)
            const startLogin = async () => {
                try {
                    if (deviceRef.current) {
                        const now = new Date()
                        const diff = (now.getTime() - new Date(deviceRef.current.created_date).getTime()) / 1000
                        if (diff >= (deviceRef.current.expires_in - 15)) {
                            deviceRef.current = null
                        }
                    }
                    if (!deviceRef.current) {
                        deviceRef.current = await api.auth.getDeviceCode()
                    }
                    setDeviceCode(deviceRef.current.user_code)
                    timeout = setTimeout(() => {
                        deviceRef.current = null
                        clearTimeout(interval)
                        startLogin()
                    }, deviceRef.current.expires_in * 1000)
                    interval = setInterval(() => {
                        api.auth.getDeviceAuth(deviceRef.current.device_code).then(res => {
                            if (res) {
                                clearInterval(interval)
                                clearTimeout(timeout)
                                return makeLogin()
                            }
                        }).catch(onError)
                    }, deviceRef.current.interval)
                } catch (error) {
                    onError(error)
                }
            }
            startLogin()
        }
        return () => {
            clearTimeout(timeout)
            clearInterval(interval)
        }
    }, [currentIndex, onError, makeLogin])

    useEffect(() => {
        return () => { deviceRef.current = null }
    }, [])

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <AppConfigBtn />
                <ContactMeBtn />
            </Header>
            <Column>
                <Row align='center center'>
                    <Heading size="large">{$L('Login')}</Heading>
                </Row>
                <Row align='center center' style={{ marginBottom: '0.6rem' }}>
                    <Button data-index='0' onClick={setView}>{$L('Email')}</Button>
                    <Button data-index='1' onClick={setView}>{$L('Code')}</Button>
                    <Button data-index='2' onClick={setView}>{$L('QR code')}</Button>
                </Row>
                <Row align='center center'>
                    <ActivityViews index={currentIndex}>
                        <LoginWithEmail
                            autoLogin={autoLogin}
                            makeLogin={makeLogin}
                            setErrorMessage={setErrorMessage}
                        />
                        <LoginWithCode deviceCode={deviceCode} />
                        <LoginWithQR deviceCode={deviceCode} />
                    </ActivityViews>
                </Row>
            </Column>
            <PopupMessage show={!!message} type='error'>
                {message}
            </PopupMessage>
        </Panel>
    )
}

export default LoginPanel
