import { useCallback, useState } from 'react'
import classNames from 'classnames'
import Spottable from '@enact/spotlight/Spottable'


/**
 * Make a component navigable and add a special className
 */
const Navigable = (WrappedComponent, focusClass) => {
    const EnhancedComponent = (props) => {
        const [isFocused, setIsFocused] = useState(false)

        const onFocus = useCallback(() => { setIsFocused(true) }, [])
        const onBlur = useCallback(() => { setIsFocused(false) }, [])
        const classes = classNames(props.className, { [focusClass]: isFocused })

        return (
            <WrappedComponent {...props}
                className={classes}
                onFocus={onFocus}
                onBlur={onBlur} />
        )
    }

    return Spottable(EnhancedComponent)
}

export default Navigable
