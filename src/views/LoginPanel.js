
import { useCallback, useEffect, useState } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import { Header, Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'

import { useSetRecoilState, useRecoilState } from 'recoil'

import { $L } from '../hooks/language'
import Login from '../components/login/Login'
import ContactMe from '../components/login/ContactMe'
import PopupMessage from '../components/Popup'
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
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

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
                setLoading(true)
                await api.auth.setCredentials({ username: email, password })
                await makeLogin()
            } catch (error) {
                setMessage(error.message)
            } finally {
                setLoading(false)
            }
        } else {
            setMessage($L('Please enter a valid email and password'))
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
                setLoading(false)
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
    }, [setEmail, setPassword, makeLogin, autoLogin, setLoading])

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='login' />
            </Header>
            <Column align='center center'>
                <Row align='center center'>
                    {loading ?
                        <Spinner />
                        :
                        <Login {...{ email, changeEmail, password, changePassword, doLogin, message }} />
                    }
                </Row>
            </Column>
            <PopupMessage show={!!message} type='error'>
                {message}
            </PopupMessage>
        </Panel>
    )
}

export default LoginPanel
