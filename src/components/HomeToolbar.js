
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
    categories: { index: 4, icon: 'bulletlist', label: $L('Categories') },
    mylist: { index: 5, icon: 'denselist', label: $L('My List') },
}

const NavigableDiv = Navigable('div', css.iconFocus)

const IconText = ({ icon, active, children }) => (
    <NavigableDiv className={classNames('', { [css.iconActive]: active })}>
        <Icon>{icon}</Icon>
        {children &&
            <Marquee>{children}</Marquee>
        }
    </NavigableDiv>
)

const HomeToolbar = ({ currentIndex, hideText }) => {

    return (
        <Column className={css.homeToolbar} align='baseline center'>
            {Object.values(TOOLBAR_INDEX).map(iconData => {
                return (
                    <IconText icon={iconData.icon}
                        key={iconData.index}
                        active={iconData.index === currentIndex}>
                        {!hideText && iconData.label}
                    </IconText>
                )
            })}

        </Column>
    )
}

HomeToolbar.propTypes = {
    currentIndex: PropTypes.number,
    hideText: PropTypes.bool
}

HomeToolbar.defaultProps = {
    hideText: false,
}

export default HomeToolbar
