
import PropTypes from 'prop-types'

import css from './Message.module.less'


const Message = ({ message, type, ...rest }) => {

    let typeClass

    if (type === 'error') {
        typeClass = css.error
    } else if (type === 'warn') {
        typeClass = css.warn
    } else {
        typeClass = css.info
    }

    return (
        <div className={[css.Message, typeClass].join(' ')} {...rest}>
            {message}
        </div>
    )
}


Message.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['info', 'error', 'warn']).isRequired,
}

export default Message
