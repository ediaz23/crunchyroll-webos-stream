
import { useCallback, useEffect, useRef, useMemo } from 'react'

import Spotlight, { getDirection } from '@enact/spotlight'
import { getTargetByDirectionFromElement } from '@enact/spotlight/src/target'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import { Column } from '@enact/ui/Layout'
import Icon from '@enact/moonstone/Icon'
import Marquee from '@enact/moonstone/Marquee'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Navigable from '../../wrappers/Navigable'
import css from './Toolbar.module.less'


const NavigableDiv = Navigable('div', css.iconFocus)

const IconText = ({ icon, active, children, autoFocus, ...rest }) => {

    /** @type {{current: {node: HTMLElement}}} */
    const compRef = useRef(null)

    useEffect(() => {
        if (compRef && autoFocus && active) {
            Spotlight.set(compRef.current.node.parentElement.dataset.spotlightId)
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

    const onKeyDown = useCallback((ev) => {
        if (onLeave) {
            const { keyCode, target } = ev
            const direction = getDirection(keyCode)
            if (direction && ['right', 'left'].includes(direction)) {
                ev.stopPropagation()
                if (direction === 'right') {
                    const candidate = getTargetByDirectionFromElement(direction, target)
                    onLeave()
                    Spotlight.focus(candidate)
                }
            }
        }
    }, [onLeave])

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

export const HomeToolbarSpotlight = SpotlightContainerDecorator(HomeToolbar)

export default HomeToolbar
