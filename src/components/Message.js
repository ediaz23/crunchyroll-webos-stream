
import PropTypes from 'prop-types'

import css from './Message.module.less'


const Message = ({ message, type, noExpand, ...rest }) => {

    let typeClass = ''

    if (type === 'error') {
        typeClass = css.error
    } else if (type === 'warn') {
        typeClass = css.warn
    } else if (type === 'info') {
        typeClass = css.info
    }

    return (
        <div className={[css.Message, typeClass].join(' ')} {...rest}>
            {!noExpand ?
                message || <div>&nbsp;</div>
                :
                message
            }
        </div>
    )
}


Message.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['info', 'error', 'warn', 'empty']).isRequired,
    expand: PropTypes.bool,
}

Message.defaultProps = {
    noExpand: false,
}

export default Message
