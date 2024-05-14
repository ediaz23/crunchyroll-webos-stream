
import { useCallback, useEffect, useRef, useMemo } from 'react'

import Spotlight, { getDirection } from '@enact/spotlight'
import { getTargetByDirectionFromElement } from '@enact/spotlight/src/target'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import { Column } from '@enact/ui/Layout'
import Icon from '@enact/moonstone/Icon'
import Marquee from '@enact/moonstone/Marquee'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import withNavigable from '../../hooks/navigable'
import css from './Toolbar.module.less'


const NavigableDiv = withNavigable('div', css.iconFocus)

const IconText = ({ icon, active, children, autoFocus, ...rest }) => {

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

const HomeToolbar = ({ toolbarList, currentIndex, hideText, autoFocus, onClick, onBlur, onFocus, onLeave, ...rest }) => {

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

HomeToolbar.defaultProps = {
    hideText: false,
    autoFocus: false,
}

export const HomeToolbarSpotlight = SpotlightContainerDecorator({
    restrict: 'self-only',
    leaveFor: { left: '', up: '', down: '' },
}, HomeToolbar)

export default HomeToolbar
