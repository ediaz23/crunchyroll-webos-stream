
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import PropTypes from 'prop-types'

/**
 * @param {{
    title: String,
    children: Object
 }}
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
    children: PropTypes.object.isRequired,
}

export default Field
