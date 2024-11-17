
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
import withLoadingList from '../../hooks/loadingList'
import { formatDurationMs, getDuration } from '../../utils'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import css from './ContentDetail.module.less'
import globalCss from '../Share.module.less'
import scrollCss from '../../patch/Scroller.module.less'


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
                <Cell grow>
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
                                <Cell grow>
                                    <Heading size="title">
                                        {episodes[index].title}
                                    </Heading>
                                </Cell>
                            </Row>
                        </Cell>
                        <Cell grow style={{ overflow: 'hidden' }}>
                            <BodyText size='small' style={{ fontSize: '1rem' }}>
                                {episodes[index].description || '\u00a0\n '.repeat(50)}
                            </BodyText>
                        </Cell>
                        <Cell shrink>
                            <BodyText>
                                {formatDurationMs(getDuration(episodes[index]))}
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
 * @param {Array<Object>} obj.episodes
 * @param {Function} obj.selectEpisode
 * @param {Number} [obj.episodeIndex]
 * @param {Function} obj.setScroll
 * @param {Function} obj.setIndexRef
 */
const EpisodesList = ({ episodes, selectEpisode, episodeIndex, setScroll, setIndexRef, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(260)
    /** @type {{current: Number}} */
    const episodeIndexRef = useRef(episodeIndex)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Array<{source: String}>} */
    const images = useMemo(() => episodes.map(episode => {
        if (!episode.list_image) {
            episode.list_image = getImagePerResolution({ height: itemHeight, content: episode })
        }
        return episode.list_image
    }), [itemHeight, episodes, getImagePerResolution])
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => {
        scrollToRef.current = scrollTo
        setScroll(scrollTo)
    }, [setScroll])

    useEffect(() => {
        episodeIndexRef.current = episodeIndex
        setIndexRef(episodeIndex)
    }, [episodeIndex, setIndexRef])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                scrollToRef.current({ index: episodeIndexRef.current || 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className={scrollCss.scrollerFix}>
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
        </div>
    )
}

EpisodesList.propTypes = {
    episodes: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectEpisode: PropTypes.func.isRequired,
    episodeIndex: PropTypes.number,
    setScroll: PropTypes.func.isRequired,
    setIndexRef: PropTypes.func.isRequired,
}

export default withLoadingList(EpisodesList, 'episodes')
