
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import PropTypes from 'prop-types'

/**
 * @param {Object} obj
 * @param {String} obj.title
 * @param {Object} obj.children
 */
const Field = ({ title, children, ...rest }) => {
    return (
        <Row {...rest}>
            <Column>
                {title &&
                    <Heading size='small' spacing='small'>{title}:</Heading>
                }
                <div>{children}</div>
            </Column>
        </Row>
    )
}

Field.propTypes = {
    title: PropTypes.string,
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object,
        PropTypes.string,
    ]).isRequired,
}

export default Field
