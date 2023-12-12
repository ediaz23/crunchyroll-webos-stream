
import { useEffect, useCallback, useRef } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import $L from '@enact/i18n/$L'
import Marquee from '@enact/moonstone/Marquee'
import VirtualList from '@enact/moonstone/VirtualList'

import PropTypes from 'prop-types'

import Navigable from '../../wrappers/Navigable'
import css from './ContentDetail.module.less'


const NavigableDiv = Navigable('div')

/**
 * @param {{
    episodes: Array<Object>,
    selectEpisode: Function,
 }}
 */
const SeasonsList = ({ seasons, selectSeason, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    const itemHeight = ri.scale(70)

    /** @type {Function} */
    const renderItem = useCallback(({ index, itemHeight: height, ...restProps }) => {
        return (
            <NavigableDiv {...restProps} key={index} style={{ height }}>
                <Row>
                    <Cell className={css.name}>
                        <Marquee marqueeOn='render'>
                            {seasons[index].title}
                        </Marquee>
                    </Cell>
                    {seasons[index].number_of_episodes &&
                        <Cell shrink>
                            {`${seasons[index].number_of_episodes} ${$L('Episodes')}`}
                        </Cell>
                    }
                </Row>
            </NavigableDiv>
        )
    }, [seasons])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && seasons.length > 0) {
                clearInterval(interval)
                scrollToRef.current({ index: 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [seasons])

    return (
        <VirtualList
            {...rest}
            className={css.firstData}
            dataSize={seasons.length}
            itemRenderer={renderItem}
            itemSize={itemHeight}
            cbScrollTo={getScrollTo}
            direction='vertical'
            verticalScrollbar='hidden'
            childProps={{
                onFocus: selectSeason,
                itemHeight,
            }}
        />
    )
}

SeasonsList.propTypes = {
    seasons: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectSeason: PropTypes.func.isRequired,
}

export default SeasonsList
