
import { useCallback, useEffect, useRef } from 'react'

import Spotlight, { getDirection } from '@enact/spotlight'
import { getTargetByDirectionFromElement } from '@enact/spotlight/src/target'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import { Column } from '@enact/ui/Layout'
import Icon from '@enact/moonstone/Icon'
import Marquee from '@enact/moonstone/Marquee'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Navigable from '../../wrappers/Navigable'
import css from './Toolbar.module.less'


const TOOLBAR_LIST = [
    { key: 'home', icon: 'home', label: $L('Home') },
    { key: 'simulcast', icon: 'resumeplay', label: $L('Simulcast') },
    { key: 'search', icon: 'search', label: $L('Search') },
    { key: 'series', icon: 'series', label: $L('Series') },
    { key: 'movies', icon: 'recordings', label: $L('Movies') },
    { key: 'musics', icon: 'music', label: $L('Music') },
    { key: 'categories', icon: 'bulletlist', label: $L('Categories') },
    { key: 'my_list', icon: 'denselist', label: $L('My List') },
    { key: 'info', icon: 'info', label: $L('About Me?') },
    { key: 'close', icon: 'closex', label: $L('Close') },
]

export const TOOLBAR_INDEX = TOOLBAR_LIST.reduce((accumulator, item, index) => {
  accumulator[item.key] = {...item, index}
  return accumulator
}, {})

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

const HomeToolbar = ({ currentIndex, hideText, autoFocus, onClick, onBlur, onFocus, onLeave, ...rest }) => {

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
            {Object.values(TOOLBAR_INDEX).map(iconData => {
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
