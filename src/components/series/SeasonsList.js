
import { useEffect, useCallback, useRef } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import VirtualList from '@enact/moonstone/VirtualList'
import Item from '@enact/moonstone/Item'

import css from './Series.module.less'


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
            <Item {...restProps} key={index} style={{ height }}>
                <Row>
                    <Cell className={css.name}>{seasons[index].title}</Cell>
                    <Cell shrink>
                        {`${seasons[index].number_of_episodes} ${$L('Episodes')}`}
                    </Cell>
                </Row>
            </Item>
        )
    }, [seasons])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                scrollToRef.current({ index: 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [])

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
