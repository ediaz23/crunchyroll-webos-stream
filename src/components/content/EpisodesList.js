
import { useEffect, useCallback, useRef, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'

import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import VirtualList from '@enact/moonstone/VirtualList'
import Image from '@enact/moonstone/Image'

import Navigable from '../../wrappers/Navigable'
import { formatDurationMs } from '../../utils'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import css from './ContentDetail.module.less'
import globalCss from '../Share.module.less'


const NavigableDiv = Navigable('div', '')

/**
 * Render an item
 * @param {{
    episodes: Array<Object>,
    images: Array<Object>,
    titles: Array<Object>,
    index: Number,
    itemHeight: Number,
 }}
 */
const renderItem = ({ episodes, images, titles, index, itemHeight: height, ...restProps }) => {
    return (
        <NavigableDiv {...restProps} key={index} style={{ height }}>
            <Row align='start space-between' style={{ paddingBottom: '0.5rem', paddingTop: '0.5rem' }}>
                <Cell shrink style={{ overflow: 'hidden' }}>
                    {images[index] &&
                        <Image src={images[index].source} sizing='fill'>
                            <div className={globalCss.progress}>
                                <div style={{ width: `${episodes[index].playhead.progress}%` }} />
                            </div>
                        </Image>
                    }
                </Cell>
                <Cell grow>
                    <Column size='100%'>
                        <Cell shrink>
                            <Heading size="title">
                                {titles[index]}
                            </Heading>
                        </Cell>
                        <Cell grow style={{ overflow: 'hidden' }}>
                            <BodyText size='small' style={{ fontSize: '1rem' }}>
                                {episodes[index].description}
                            </BodyText>
                        </Cell>
                        <Cell shrink>
                            <BodyText>
                                {formatDurationMs(episodes[index].duration_ms)}
                            </BodyText>
                        </Cell>
                    </Column>
                </Cell>
            </Row>
        </NavigableDiv>
    )
}

/**
 * @param {{
    episodes: Array<Object>,
    selectEpisode: Function,
 }}
 */
const EpisodesList = ({ episodes, selectEpisode, ...rest }) => {
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    const itemHeight = ri.scale(260)
    /** @type {Array<{source: String}>} */
    const images = useMemo(() => episodes.map(episode => {
        if (!episode.list_image) {
            episode.list_image = getImagePerResolution({ height: itemHeight, content: episode })
        }
        return episode.list_image
    }), [itemHeight, episodes, getImagePerResolution])
    /** @type {Array<String>} */
    const titles = useMemo(() => episodes.map(episode => {
        return [
            (episode.episode_number && episode.episode_number.toString()) || '',
            (episode.episode_number && '-') || '',
            episode.title
        ].join(' ').trim()
    }), [episodes])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                if (episodes.length > 0) {
                    scrollToRef.current({ index: 0, animate: false, focus: true })
                }
            }
        }, 100)
        return () => clearInterval(interval)
    }, [episodes])

    return (
        <VirtualList
            {...rest}
            dataSize={episodes.length}
            itemRenderer={renderItem}
            itemSize={itemHeight}
            cbScrollTo={getScrollTo}
            direction='vertical'
            verticalScrollbar='hidden'
            childProps={{
                onClick: selectEpisode,
                className: css.episode,
                itemHeight,
                episodes,
                images,
                titles,
            }}
        />
    )
}

EpisodesList.propTypes = {
    episodes: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectEpisode: PropTypes.func.isRequired,
}

export default EpisodesList
