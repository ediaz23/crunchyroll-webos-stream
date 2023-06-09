import { useCallback, useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import { Header, Panel } from '@enact/moonstone/Panels'

import $L from '@enact/i18n/$L'
import { useSetRecoilState, useRecoilState } from 'recoil'

import Login from '../components/Login'
import Message from '../components/Message'
import ContactMe from '../components/ContactMe'
import { pathState, initScreenState, autoLoginState } from '../recoilConfig'
import api from '../api'


const LoginPanel = ({ ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {[String, Function]} */
    const [email, setEmail] = useState('')
    /** @type {[String, Function]} */
    const [password, setPassword] = useState('')
    /** @type {[String, Function]}  */
    const [message, setMessage] = useState('')
    /** @type {Function} */
    const setInitScreenState = useSetRecoilState(initScreenState)
    /** @type {[Boolean, Function]}  */
    const [autoLogin, setAutoLogin] = useRecoilState(autoLoginState)

    const makeLogin = useCallback(async () => {
        await api.auth.login()
        await api.account.getAccount()
        setInitScreenState('/profiles')
        setPath('/profiles')
        setAutoLogin(true)
    }, [setInitScreenState, setPath, setAutoLogin])

    const doLogin = useCallback(async () => {
        if (email && password) {
            try {
                await api.auth.setCredentials({ username: email, password })
                await makeLogin()
            } catch (error) {
                setMessage(error.message)
            }
        } else {
            setMessage($L('Please enter a valid email and password.'))
        }
    }, [setMessage, email, password, makeLogin])
    const changeEmail = useCallback(({ value }) => {
        setMessage('')
        setEmail(value)
    }, [setEmail, setMessage])
    const changePassword = useCallback(({ value }) => {
        setMessage('')
        setPassword(value)
    }, [setPassword, setMessage])

    useEffect(() => {
        const loadData = async () => {
            const setCredentiasl = async () => {
                const credentials = await api.auth.getCredentials()
                if (credentials) {
                    setEmail(credentials.username)
                    setPassword(credentials.password)
                }
            }
            if (autoLogin && await api.auth.getSession()) {
                try {
                    await makeLogin()
                } catch (_e) {
                    await setCredentiasl()
                }
            } else {
                await setCredentiasl()
            }
        }
        loadData()
    }, [setEmail, setPassword, makeLogin, autoLogin])

    const rowStyle = { marginTop: '1rem' }

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='login' />
            </Header>
            <Row align='center center' style={rowStyle}>
                <Login {...{ email, changeEmail, password, changePassword, doLogin, message }} />
            </Row>
            <Row align='center center' style={rowStyle}>
                {message && <Message type='error' message={message} />}
            </Row>
        </Panel>
    )
}

export default LoginPanel
