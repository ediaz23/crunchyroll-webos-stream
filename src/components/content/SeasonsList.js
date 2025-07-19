
import { useEffect, useCallback, useRef } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import Marquee from '@enact/moonstone/Marquee'
import VirtualList from '@enact/moonstone/VirtualList'

import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import { useDelayedCall } from '../../hooks/delayedCall'
import withNavigable from '../../hooks/navigable'
import LoadingList from '../LoadingList'
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
                <Cell grow className={css.name} style={{ width: 'auto' }}>
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
 * @param {Number} [obj.seasonIndex]
 * @param {Function} obj.selectEpisode
 */
const SeasonsList = ({ seasons, seasonIndex, selectSeason, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(70)
    /** @type {{current: Number}} */
    const seasonIndexRef = useRef(null)

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onFocusCallback = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (seasonIndexRef.current !== index) {
            selectSeason(index)
        }
    }, [selectSeason])

    /** @type {Function} */
    const onFocus = useDelayedCall(onFocusCallback, 500)

    useEffect(() => {
        seasonIndexRef.current = seasonIndex
    }, [seasonIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && seasonIndexRef.current != null) {
                clearInterval(interval)
                scrollToRef.current({ index: seasonIndexRef.current, animate: false, focus: true })
            }
        }, 100)
        return () => {
            clearInterval(interval)
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
    seasonIndex: PropTypes.number,
    selectSeason: PropTypes.func.isRequired,
}

export default SeasonsList
