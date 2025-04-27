
import { useCallback, useEffect, useRef, useMemo } from 'react'

import Spotlight, { getDirection } from '@enact/spotlight'
import { getTargetByDirectionFromElement } from '@enact/spotlight/src/target'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import { Column } from '@enact/ui/Layout'
import Transition from '@enact/ui/Transition'
import Icon from '@enact/moonstone/Icon'
import Marquee from '@enact/moonstone/Marquee'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import withNavigable from '../../hooks/navigable'
import FloatingLayerFix from '../../patch/FloatingLayer'
import css from './Toolbar.module.less'


const NavigableDiv = withNavigable('div', css.iconFocus)

export const IconText = ({ icon, active, children, autoFocus = false, ...rest }) => {

    /** @type {{current: {node: HTMLElement}}} */
    const compRef = useRef(null)

    useEffect(() => {
        if (compRef && autoFocus && active) {
            Spotlight.focus(compRef.current.node)
        }
    }, [compRef, autoFocus, active])

    return (
        <NavigableDiv className={classNames('', { [css.iconActive]: active })}
            id={icon} {...rest} ref={compRef}>
            <Icon size='large'>{icon}</Icon>
            {children &&
                <Marquee>{children}</Marquee>
            }
        </NavigableDiv>
    )
}

/**
 * Left toolbar
 * @param {Object} obj
 * @param {Array<{key: String, icon: String, label: String}>} obj.toolbarList
 * @param {Number} obj.currentIndex
 * @param {Boolean} [obj.hideText]
 * @param {Boolean} [obj.autoFocus]
 * @param {Function} [obj.onClick]
 * @param {Function} [obj.onBlur]
 * @param {Function} [obj.onFocus]
 * @param {Function} [obj.onLeave]
 */
const HomeToolbar = ({
    toolbarList, currentIndex, hideText = false, autoFocus = false,
    onClick, onBlur, onFocus, onLeave, ...rest }) => {

    const toolbarIndex = useMemo(() => toolbarList.reduce((accumulator, item, index) => {
        accumulator[item.key] = { ...item, index }
        return accumulator
    }, {}), [toolbarList])

    const moveFocus = useCallback((target, direction) => {
        let candidate = getTargetByDirectionFromElement(direction, target)
        if (candidate && candidate.id === 'content-banner') {
            const newCandidate = getTargetByDirectionFromElement('down', candidate)
            candidate = newCandidate ? newCandidate : candidate
        }
        if (candidate) {
            onLeave()
            Spotlight.focus(candidate)
        }
    }, [onLeave])

    const onKeyDown = useCallback((ev) => {
        if (onLeave) {
            const { keyCode, target } = ev
            const direction = getDirection(keyCode)
            if (direction === 'right') {
                ev.stopPropagation()
                moveFocus(target, direction)
            }
        }
    }, [onLeave, moveFocus])

    return (
        <Column className={css.homeToolbar} align='baseline center' {...rest}>
            {Object.values(toolbarIndex).map(iconData => {
                return (
                    <IconText icon={iconData.icon}
                        key={iconData.index}
                        data-index={iconData.index}
                        active={iconData.index === currentIndex}
                        autoFocus={autoFocus}
                        onClick={onClick}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        onKeyDown={onKeyDown}>
                        {!hideText && iconData.label}
                    </IconText>
                )
            })}
        </Column>
    )
}

HomeToolbar.propTypes = {
    toolbarList: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        icon: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
    currentIndex: PropTypes.number.isRequired,
    hideText: PropTypes.bool,
    autoFocus: PropTypes.bool,
    onClick: PropTypes.func,
    onBlur: PropTypes.func,
    onFocus: PropTypes.func,
    onLeave: PropTypes.func,
}

/**
 * Floating Left toolbar
 * @param {Object} obj
 * @param {Boolean} obj.open
 * @param {Array<{key: String, icon: String, label: String}>} obj.toolbarList
 * @param {Number} obj.currentIndex
* @param {Function} obj.onLeave
 * @param {Function} [obj.onClick]
 */
export const FloatingHomeToolbarBase = ({ open, toolbarList, currentIndex, onLeave, onClick, ...rest }) => {
    /** @type {{current: int}} */
    const closeTimeout = useRef(null)
    /** @type {Function} */
    const clearTimeoutFn = () => {
        clearTimeout(closeTimeout.current)
        closeTimeout.current = null
    }
    /** @type {Function} */
    const onLeaveSuper = useCallback(() => {
        clearTimeoutFn()
        onLeave()
    }, [onLeave])

    /** @type {Function} */
    const onBlurCaptureSuper = rest.onBlurCapture
    rest.onBlurCapture = useCallback((ev) => {
        clearTimeoutFn()
        closeTimeout.current = setTimeout(onLeaveSuper, 150)
        onBlurCaptureSuper(ev)
    }, [onBlurCaptureSuper, onLeaveSuper])

    /** @type {Function} */
    const onFocusCaptureSuper = rest.onFocusCapture
    rest.onFocusCapture = useCallback((ev) => {
        clearTimeoutFn()
        onFocusCaptureSuper(ev)
    }, [onFocusCaptureSuper])

    useEffect(() => clearTimeoutFn, [])

    return (
        <Transition visible={open} type='slide' direction='right'>
            <FloatingLayerFix open={open} onDismiss={onLeaveSuper}
                style={{
                    background: 'linear-gradient(to right, #000000 20%, rgba(0, 0, 0, 0))',
                    paddingLeft: '0.6rem',
                }}
                {...rest}>
                <HomeToolbar toolbarList={toolbarList}
                    currentIndex={currentIndex}
                    onClick={onClick}
                    onLeave={onLeaveSuper}
                    autoFocus />
            </FloatingLayerFix>
        </Transition>
    )
}

export const FloatingHomeToolbar = SpotlightContainerDecorator({
    restrict: 'self-only',
    leaveFor: { left: '', up: '', down: '' },
}, FloatingHomeToolbarBase)

FloatingHomeToolbar.defaultProps = {
    open: PropTypes.bool.isRequired,
    toolbarList: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        icon: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
    currentIndex: PropTypes.number.isRequired,
    onLeave: PropTypes.func.isRequired,
    onClick: PropTypes.func,
}

export default HomeToolbar
