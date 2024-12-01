
import { useEffect, useCallback, useRef } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import Marquee from '@enact/moonstone/Marquee'
import VirtualList from '@enact/moonstone/VirtualList'

import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import LoadingList from '../LoadingList'
import withNavigable from '../../hooks/navigable'
import css from './ContentDetail.module.less'


const NavigableDiv = withNavigable('div')

/**
 * Render an item
 * @param {Object} obj
 * @param {Number} obj.index
 * @param {Number} obj.itemHeight
 * @param {Array<Object>} obj.seasons
 */
const renderItem = ({ index, itemHeight: height, seasons, ...rest }) => {
    return (
        <NavigableDiv {...rest} key={index} style={{ height }}>
            <Row>
                {seasons[index].season_sequence_number &&
                    <Cell shrink>
                        {seasons[index].season_sequence_number}
                    </Cell>
                }
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
}

/**
 * @param {Object} obj
 * @param {Array<Object>} [obj.seasons]
 * @param {Function} obj.selectEpisode
 * @param {Number} [obj.seasonIndex]
 */
const SeasonsList = ({ seasons, selectSeason, seasonIndex, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(70)
    /** @type {{current: Number}} */
    const seasonIndexRef = useRef(null)
    /** @type {{current: Number}} */
    const timeoutRef = useRef(null)

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onFocus = useCallback(ev => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            const target = ev.currentTarget || ev.target
            const newIndex = parseInt(target.dataset.index)
            if (seasonIndexRef.current !== newIndex) {
                selectSeason(newIndex)
            }
        }, 500)
    }, [selectSeason])

    useEffect(() => { seasonIndexRef.current = seasonIndex }, [seasonIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && seasonIndexRef.current != null) {
                clearInterval(interval)
                scrollToRef.current({ index: seasonIndexRef.current, animate: false, focus: true })
            }
        }, 100)
        return () => {
            clearInterval(interval)
            clearTimeout(timeoutRef.current)
        }
    }, [])

    return (
        <LoadingList
            list={seasons}
            index={seasonIndex}
            scrollFn={scrollToRef.current}>
            {seasons && seasons.length > 0 &&
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
                        onFocus,
                        itemHeight,
                        seasons,
                    }}
                />
            }
        </LoadingList>
    )
}

SeasonsList.propTypes = {
    seasons: PropTypes.array,
    selectSeason: PropTypes.func.isRequired,
    seasonIndex: PropTypes.number,
}

export default SeasonsList
