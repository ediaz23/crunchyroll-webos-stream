
import { useState, useCallback, useEffect } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import Input from '@enact/moonstone/Input'
import Button from '@enact/moonstone/Button'
import Heading from '@enact/moonstone/Heading'
import Icon from '@enact/moonstone/Icon'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'
import { config, localStore } from 'crunchyroll-js-api'
import QRCode from 'react-qr-code'

import css from './Login.module.less'
import { DevBtn, AppConfigBtn } from '../Buttons'
import Field from '../Field'
import { $L } from '../../hooks/language'
import api from '../../api'


/**
 * @param {Object} obj
 * @param {String} obj.deviceCode
 */
export const LoginWithCode = ({ deviceCode, ...rest }) => {

    return (
        <Column className={css.loginForm} {...rest}>
            {!deviceCode &&
                <Spinner />
            }
            {deviceCode && <>
                <Heading size='small'>{$L('Use this code to login')}</Heading>
                <Field type='text' title={$L('Access at')} size='large'>
                    {config.url + '/activate'}
                </Field>
                <Field type='text' title={$L('Enter this code')} size='small'>
                    {deviceCode}
                </Field>
                <Field type='text' title={$L('Please')}>
                    {$L('Wait till automatic login')}
                </Field>
            </>}
        </Column>
    )
}

LoginWithCode.propTypes = {
    deviceCode: PropTypes.string,
}

/**
 * @param {Object} obj
 * @param {String} obj.deviceCode
 */
export const LoginWithQR = ({ deviceCode, ...rest }) => {
    const deviceName = localStore.storage.device.name
    const url = window.encodeURI(`${config.url}/activate?code=${deviceCode}&device_name=${deviceName}`)

    return (
        <Column className={css.loginForm} {...rest}>
            {!deviceCode &&
                <Spinner />
            }
            {deviceCode && <>
                <Heading size='small'>{$L('Scan qr code to login')}</Heading>
                <Field type='text' size='large'>
                    <div style={{ height: 'auto', margin: '0 auto', maxWidth: '15rem', width: '100%' }}>
                        <QRCode
                            size={256}
                            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                            value={url}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                </Field>
                <Field type='text' title={$L('Please')}>
                    {$L('Wait till automatic login')}
                </Field>
            </>}
        </Column>
    )
}

LoginWithQR.propTypes = {
    deviceCode: PropTypes.string,
}


/**
 * @param {Object} obj
 * @param {Boolean} obj.autoLogin
 * @param {Function} obj.makeLogin
 * @param {Function} obj.setErrorMessage
 */
export const LoginWithEmail = ({ autoLogin, makeLogin, setErrorMessage, ...rest }) => {
    /** @type {[String, Function]} */
    const [email, setEmail] = useState('')
    /** @type {[String, Function]} */
    const [password, setPassword] = useState('')
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    const doLogin = useCallback(async () => {
        if (email && password) {
            try {
                setLoading(true)
                await api.auth.setCredentials({ username: email, password })
                await makeLogin()
            } catch (error) {
                setErrorMessage(error.message || error.code)
            } finally {
                setLoading(false)
            }
        } else {
            setErrorMessage($L('Please enter a valid email and password'))
        }
    }, [setErrorMessage, email, password, makeLogin])
    const changeEmail = useCallback(({ value }) => {
        setErrorMessage('')
        setEmail(value)
    }, [setEmail, setErrorMessage])
    const changePassword = useCallback(({ value }) => {
        setErrorMessage('')
        setPassword(value)
    }, [setPassword, setErrorMessage])

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
        <Column className={css.loginForm} {...rest}>
            {loading &&
                <Spinner />
            }
            {!loading && <>
                <Heading size='small'>{$L('Use your email and password')}</Heading>
                <Row>
                    <Input
                        type='email'
                        placeholder={$L('Email')}
                        value={email}
                        onChange={changeEmail}
                    />
                </Row>
                <Row>
                    <Input
                        type='password'
                        placeholder={$L('Password')}
                        value={password}
                        onChange={changePassword}
                    />
                </Row>
                <Row align='center flex-end'>
                    <Button onClick={doLogin}>
                        <Icon style={{ marginRight: '0.5rem' }}>
                            plug
                        </Icon>
                        {$L('Login')}
                    </Button>
                    <AppConfigBtn mode='full' />
                    <DevBtn />
                </Row>
            </>}
        </Column>
    )
}

LoginWithEmail.propTypes = {
    autoLogin: PropTypes.bool.isRequired,
    makeLogin: PropTypes.func.isRequired,
    setErrorMessage: PropTypes.func.isRequired,
}

export default LoginWithEmail
