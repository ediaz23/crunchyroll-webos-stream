import { useCallback, useEffect, useState } from 'react'
import { Row } from '@enact/ui/Layout'
import { Header, Panel } from '@enact/moonstone/Panels'

import $L from '@enact/i18n/$L'
import { useSetRecoilState } from 'recoil'

import Login from '../components/Login'
import Message from '../components/Message'
import ContactMe from '../components/ContactMe'
import { pathState, initScreenState } from '../recoilConfig'
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

    const makeLogin = useCallback(async () => {
        await api.login()
        await api.getAccount()
        setInitScreenState('/profiles')
        setPath('/profiles')
    }, [setInitScreenState, setPath])

    const doLogin = useCallback(async () => {
        if (email && password) {
            try {
                await api.setCredentials({ username: email, password })
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
                const credentials = await api.getCredentials()
                if (credentials) {
                    setEmail(credentials.username)
                    setPassword(credentials.password)
                }
            }
            if (await api.getSession()) {
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
    }, [setEmail, setPassword, makeLogin])

    const rowStyle = { justifyContent: 'center', marginTop: '1rem' }

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                <ContactMe origin='login' />
            </Header>
            <Row style={rowStyle}>
                <Login {...{ email, changeEmail, password, changePassword, doLogin, message }} />
            </Row>
            <Row style={rowStyle}>
                {message && <Message type='error' message={message} />}
            </Row>
        </Panel>
    )
}

export default LoginPanel
