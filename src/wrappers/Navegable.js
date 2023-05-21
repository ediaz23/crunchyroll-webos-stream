import { useCallback, useState } from 'react'
import classNames from 'classnames'
import Spottable from '@enact/spotlight/Spottable'


/**
 * Make a component navigable and add a special className
 */
const Navegable = (WrappedComponent, profileFocus) => {
    const EnhancedComponent = (props) => {
        const [isFocused, setIsFocused] = useState(false)

        const onFocus = useCallback(() => { setIsFocused(true) }, [])
        const onBlur = useCallback(() => { setIsFocused(false) }, [])
        const classes = classNames(props.className, { [profileFocus]: isFocused })

        return (
            <WrappedComponent {...props}
                className={classes}
                onFocus={onFocus}
                onBlur={onBlur} />
        )
    }

    return Spottable(EnhancedComponent)
}

export default Navegable
