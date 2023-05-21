import { Row, Column } from '@enact/ui/Layout'
import Input from '@enact/moonstone/Input'
import Button from '@enact/moonstone/Button'
import Heading from '@enact/moonstone/Heading'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import css from './Login.module.less'


const Login = ({ email, changeEmail, password, changePassword, doLogin, ...rest }) => {
    return (
        <Column className={css.loginForm} {...rest}>
            <Heading size="large">{$L('Login')}</Heading>
            <Heading size="small">{$L('Use your email and password.')}</Heading>
            <Row>
                <Input
                    type="email"
                    placeholder={$L('Email')}
                    value={email}
                    onChange={changeEmail}
                />
            </Row>
            <Row>
                <Input
                    type="password"
                    placeholder={$L('Password')}
                    value={password}
                    onChange={changePassword}
                />
            </Row>
            <Row className={css.loginButton} align="center">
                <Button onClick={doLogin}>
                    {$L('Login')}
                </Button>
            </Row>
        </Column>
    )
}

Login.propTypes = {
    email: PropTypes.string,
    password: PropTypes.string,
    message: PropTypes.string,
    changeEmail: PropTypes.func.isRequired,
    changePassword: PropTypes.func.isRequired,
    doLogin: PropTypes.func.isRequired,
}

export default Login
