
import { useEffect, useCallback, useRef, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import VirtualList from '@enact/moonstone/VirtualList'
import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import withNavigable from '../../hooks/navigable'
import LoadingList from '../LoadingList'
import { formatDurationMs, getDuration } from '../../utils'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import css from './ContentDetail.module.less'
import globalCss from '../Share.module.less'


const NavigableDiv = withNavigable('div', '')

/**
 * Render an item
 * @param {Object} obj
 * @param {Array<Object>} obj.episodes
 * @param {Array<Object>} obj.images
 * @param {Number} obj.index
 * @param {Number} obj.itemHeight
 */
const renderItem = ({ episodes, images, index, itemHeight: height, ...rest }) => {
    return (
        <NavigableDiv className={css.episode} key={index} style={{ height }} {...rest}>
            <Row align='start space-between' style={{ paddingBottom: '0.5rem', paddingTop: '0.5rem' }}>
                <Cell shrink style={{ overflow: 'hidden' }}>
                    {images[index] &&
                        <Image src={images[index].source} sizing='fill'>
                            <div className={globalCss.progress}>
                                <div style={{ width: `${episodes[index].playhead.progress}%` }} />
                            </div>
                            {episodes[index].showPremium &&
                                <div className={globalCss.contenPremium}>{$L('Premium')}</div>
                            }
                        </Image>
                    }
                </Cell>
                <Cell grow style={{ width: 'auto' }}>
                    <Column size='100%'>
                        <Cell shrink>
                            <Row>
                                {episodes[index].episode_number &&
                                    <Cell shrink>
                                        <Heading size="title">
                                            {episodes[index].episode_number}
                                        </Heading>
                                    </Cell>
                                }
                                <Cell grow style={{ width: 'auto' }}>
                                    <Heading size="title">
                                        {episodes[index].title}
                                    </Heading>
                                </Cell>
                            </Row>
                        </Cell>
                        <Cell shrink>
                            <BodyText style={{ marginBottom: '0', marginTop: '0' }}>
                                {formatDurationMs(getDuration(episodes[index]))}
                            </BodyText>
                        </Cell>
                        <Cell grow style={{ overflow: 'hidden', height: 'auto' }}>
                            <BodyText size='small' style={{ fontSize: '1rem' }}>
                                {episodes[index].description || '\u00a0\n '.repeat(50)}
                            </BodyText>
                        </Cell>
                    </Column>
                </Cell>
            </Row>
        </NavigableDiv>
    )
}

/**
 * @param {Object} obj
 * @param {Array<Object>} [obj.episodes]
 * @param {Number} [obj.episodeIndex]
 * @param {Function} obj.selectEpisode
 */
const EpisodesList = ({ episodes, episodeIndex, selectEpisode, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(260)
    /** @type {{current: Number}} */
    const episodeIndexRef = useRef(null)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Array<{source: String}>} */
    const images = useMemo(() => {
        let out = []
        if (episodes) {
            out = episodes.map(episode => {
                if (!episode.list_image) {
                    episode.list_image = getImagePerResolution({ height: itemHeight, content: episode })
                }
                return episode.list_image
            })
        }
        return out
    }, [itemHeight, episodes, getImagePerResolution])

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    useEffect(() => {
        episodeIndexRef.current = episodeIndex
    }, [episodeIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && episodeIndexRef.current != null) {
                clearInterval(interval)
                scrollToRef.current({ index: episodeIndexRef.current, animate: false, focus: true })
            }
        }, 100)
        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <LoadingList
            list={episodes}
            index={episodeIndex}
            scrollFn={scrollToRef.current}>
            {episodes && episodes.length > 0 &&
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
                        itemHeight,
                        episodes,
                        images,
                    }}
                />
            }
        </LoadingList>
    )
}

EpisodesList.propTypes = {
    episodes: PropTypes.array,
    episodeIndex: PropTypes.number,
    selectEpisode: PropTypes.func.isRequired,
}

export default EpisodesList
