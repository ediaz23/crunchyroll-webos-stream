import { useCallback, useEffect, useRef } from 'react'

import Spotlight, { getDirection } from '@enact/spotlight'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import { Column } from '@enact/ui/Layout'
import Icon from '@enact/moonstone/Icon'
import Marquee from '@enact/moonstone/Marquee'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Navigable from '../wrappers/Navigable'
import css from './HomeToolbar.module.less'

export const TOOLBAR_INDEX = {
    home: { index: 0, icon: 'home', label: $L('Home') },
    search: { index: 1, icon: 'search', label: $L('Search') },
    series: { index: 2, icon: 'resumeplay', label: $L('Series') },
    movies: { index: 3, icon: 'recordings', label: $L('Movies') },
    music: { index: 4, icon: 'music', label: $L('Music') },
    categories: { index: 5, icon: 'bulletlist', label: $L('Categories') },
    mylist: { index: 6, icon: 'denselist', label: $L('My List') },
    about: { index: 7, icon: 'info', label: $L('About Me?') },
    close: { index: 8, icon: 'closex', label: $L('Close') },
}

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
            <Icon>{icon}</Icon>
            {children &&
                <Marquee>{children}</Marquee>
            }
        </NavigableDiv>
    )
}

const HomeToolbar = ({ currentIndex, hideText, autoFocus, onClick, onBlur, onFocus, onLeave, ...rest }) => {

    const onKeyDown = useCallback((ev) => {
        if (onLeave) {
            const { keyCode } = ev
            const direction = getDirection(keyCode)
            if (direction && ['right', 'left'].includes(direction)) {
                onLeave()
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
