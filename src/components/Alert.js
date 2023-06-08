
import { SpotlightContainerDecorator } from '@enact/spotlight/SpotlightContainerDecorator'
import { Row } from '@enact/ui/Layout'
import { Column } from '@enact/ui/Layout'
import FloatingLayer from '@enact/ui/FloatingLayer'
import Skinnable from '@enact/moonstone/Skinnable'
import Heading from '@enact/moonstone/Heading'
import Button from '@enact/moonstone/Button'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import css from './Alert.module.less'


const AlertBase = ({ open, title, message, onCancel, onAccept, ...rest }) => {

    return (
        <FloatingLayer className={css.Alert} open={open} noAutoDismiss>
            <Column style={{ height: 'auto' }} {...rest} className={css.content}>
                {title && <Heading size='medium'>{title}</Heading>}
                {message && <Heading size="small">{message}</Heading>}
                <Row align='baseline flex-end'>
                    {onCancel && <Button onClick={onCancel}>{$L('Cancel')}</Button>}
                    <Button onClick={onAccept}>{$L('Accept')}</Button>
                </Row>
            </Column>
        </FloatingLayer >
    )
}

const AlertSpot = SpotlightContainerDecorator(AlertBase)
const Alert = Skinnable({ defaultSkin: 'light' }, AlertSpot)

Alert.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.string,
    message: PropTypes.string,
    onCancel: PropTypes.func,
    onAccept: PropTypes.func.isRequired,
}

export default Alert
