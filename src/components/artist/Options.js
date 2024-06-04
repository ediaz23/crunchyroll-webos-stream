
import { useCallback, useMemo, useRef, useEffect } from 'react'
import ri from '@enact/ui/resolution'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import css from './Artist.module.less'
import cssShared from '../Share.module.less'

/**
 * @param {Object} obj
 * @param {Object} obj.artist
 * @param {Function} obj.selectContent
 */
const Options = ({ artist, selectContent, ...rest }) => {
    /** @type {Array<String>} */
    const videoIds = useMemo(() => artist.videos, [artist])
    /** @type {Array<String>} */
    const concertIds = useMemo(() => artist.concerts, [artist])
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    const itemHeight = ri.scale(70)

    const selectVideos = useCallback(() => selectContent('videos'), [selectContent])
    const selectConcerts = useCallback(() => selectContent('concerts'), [selectContent])

    /** @type {Array<Object>} */
    const data = useMemo(() => {
        let out = []
        if (videoIds.length > 0) {
            out.push({
                childProps: { onFocus: selectVideos },
                icon: '🎥',
                title: $L('Videos'),
            })
        }
        if (concertIds.length > 0) {
            out.push({
                childProps: { onFocus: selectConcerts },
                icon: '🎤',
                title: $L('Concerts'),
            })
        }
        return out
    }, [selectVideos, selectConcerts, videoIds, concertIds])

    /** @type {Function} */
    const renderItem = useCallback(({ index, itemHeight: height, ...restProps }) => {
        return (
            <Item {...restProps}
                {...data[index].childProps}
                key={index}
                style={{ height }}>
                <Icon className={cssShared.IconCustomColor}>
                    {data[index].icon}
                </Icon>
                <span>{data[index].title}</span>
            </Item>
        )
    }, [data])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && data.length > 0) {
                clearInterval(interval)
                scrollToRef.current({ index: 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [data])

    return (
        <VirtualList
            {...rest}
            className={css.optionsContainer}
            dataSize={data.length}
            itemRenderer={renderItem}
            itemSize={itemHeight}
            cbScrollTo={getScrollTo}
            direction='vertical'
            verticalScrollbar='hidden'
            childProps={{ itemHeight }}
        />
    )
}

Options.propTypes = {
    artist: PropTypes.object.isRequired,
    selectContent: PropTypes.func.isRequired,
}

export default Options
