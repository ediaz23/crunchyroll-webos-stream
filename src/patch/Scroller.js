
import Scrollable from '@enact/moonstone/Scrollable'
import PropTypes from 'prop-types'
import { ScrollerBase } from '@enact/moonstone/Scroller'


class ScrollerFix extends ScrollerBase {
    componentDidMount() {
        super.componentDidMount()
        setTimeout(() => {
            this.uiRefCurrent.calculateMetrics()
        }, 200)
    }
}


const Scroller = (props) => (
    <Scrollable
        {...props}
        childRenderer={(scrollerProps) => { // eslint-disable-line react/jsx-no-bind
            return <ScrollerFix {...scrollerProps} />
        }}
    />
)

Scroller.propTypes = /** @lends moonstone/Scroller.Scroller.prototype */ {
    direction: PropTypes.oneOf(['both', 'horizontal', 'vertical'])
}

Scroller.defaultProps = {
    direction: 'both'
}

export default Scroller
