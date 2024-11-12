
import Scrollable from '@enact/moonstone/Scrollable'
import PropTypes from 'prop-types'
import { ScrollerBase } from '@enact/moonstone/Scroller'

import scrollCss from './Scroller.module.less'

class ScrollerFix extends ScrollerBase {
    componentDidMount() {
        super.componentDidMount()
        setTimeout(() => {
            this.uiRefCurrent.calculateMetrics()
        }, 200)
    }
}


const Scroller = ({ direction = 'both', ...props }) => {

    const newClassName = `${props.className || ''} ${scrollCss.scrollerFix}`
    return (
        <Scrollable
            direction={direction}
            {...props}
            className={newClassName}
            childRenderer={(scrollerProps) => { // eslint-disable-line react/jsx-no-bind
                return <ScrollerFix {...scrollerProps} />
            }}
        />
    )
}

Scroller.propTypes = /** @lends moonstone/Scroller.Scroller.prototype */ {
    direction: PropTypes.oneOf(['both', 'horizontal', 'vertical'])
}

export default Scroller
