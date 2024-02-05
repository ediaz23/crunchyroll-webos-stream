
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ri from '@enact/ui/resolution'
import Heading from '@enact/moonstone/Heading'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import VirtualListNested from '../../patch/VirtualListNested'
import { homefeedReadyState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContentHook'
import Navigable from '../../wrappers/Navigable'
import { formatDurationMs, getDuration } from '../../utils'
import css from './FeedRow.module.less'
import globalCss from '../Share.module.less'
import logger from '../../logger'
import { DEV_FAST_SELECT, DEV_CONTENT_TYPE } from '../../const'

const NavigableDiv = Navigable('div', '')


const Poster = ({ item, image, itemSize, ...rest }) => {
    /** @type {Array<String>} */
    const playableTypes = useMemo(() =>
        ['episode', 'movie', 'musicConcert', 'musicVideo'], [])
    rest.style.width = itemSize
    let progress = 0, duration = undefined

    if (playableTypes.includes(item.type)) {
        duration = getDuration(item)
        if (duration !== undefined && item.playhead !== undefined) {
            progress = item.playhead / (duration / 100) * 100
        }
    }

    return (
        <NavigableDiv {...rest} >
            <Image src={image.source} sizing='none' style={image.size}>
                {playableTypes.includes(item.type) &&
                    <div className={globalCss.progress} style={{ bottom: '1.8rem' }}>
                        <div style={{ width: `${progress}%` }} />
                    </div>
                }
            </Image>
            {playableTypes.includes(item.type) && <div className={css.playButton} />}
            {playableTypes.includes(item.type) &&
                <div className={css.contentTime}>{formatDurationMs(duration)}</div>
            }
            {/*
            <Heading size="small">
                {item.name}
            </Heading>
            */}
        </NavigableDiv >
    )
}

const HomeFeedItem = ({ feed, index, itemHeight, ...rest }) => {
    const feedItem = feed.items[index]
    const getImagePerResolution = useGetImagePerResolution()
    const margin = ri.scale(20)
    const image = getImagePerResolution({ height: itemHeight, width: rest.itemSize - margin, content: feedItem })
    return (
        <Poster item={feedItem}
            image={image}
            {...rest} />
    )
}

const HomeFeedRow = ({ feed, itemSize, cellId, setContent, style, className, index, ...rest }) => {
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)
    /** @type {[Number, Function]} */
    const [itemHeight, setItemHeight] = useState(0)
    const itemWidth = ri.scale(320)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Function} */
    const setHomefeedReady = useSetRecoilState(homefeedReadyState)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {Function} */
    const selectElement = useCallback((ev) => {
        setContent(feed.items[parseInt(ev.target.dataset.index)])
    }, [setContent, feed.items])
    const setContentNavagate = useSetContent()
    /** @type {Function} */
    const showContentDetail = useCallback((ev) => {
        /** @type {HTMLElement} */
        const parentElement = ev.target.closest(`#${cellId}`)
        const content = feed.items[parseInt(parentElement.dataset.index)]
        setContentNavagate(content)
    }, [cellId, setContentNavagate, feed.items])

    const newStyle = useMemo(() => Object.assign({}, style, { height: itemSize, }), [style, itemSize])
    const newClassName = useMemo(() => `${className} ${css.homeFeedRow}`, [className])

    useEffect(() => {
        if (compRef && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect()
            setItemHeight(itemSize - boundingRect.height * 2)
        }
    }, [compRef, itemSize])

    useEffect(() => {
        if (index === 0) {
            const interval = setInterval(() => {
                if (scrollToRef.current) {
                    clearInterval(interval)
                    scrollToRef.current({ index: 0, animate: false, focus: true })
                    setHomefeedReady(true)
                }
            }, 100)
            return () => clearInterval(interval)
        }
    }, [setHomefeedReady])  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        logger.info(new Set(feed.items.map(val => val.type)))
        if (DEV_FAST_SELECT && DEV_CONTENT_TYPE) {
            const testContent = {
                series: 'GRDV0019R',
                episode: 'GZ7UV13VE',
                musicArtist: 'MA899F289',
                musicConcert: 'MC413F8154',
            }
            const content = feed.items.find(val => val.type === DEV_CONTENT_TYPE &&
                val.id === testContent[DEV_CONTENT_TYPE])
            if (content) {
                setContentNavagate(content)
            }
        }
    }, [feed.items, setContentNavagate])

    return (
        <div className={newClassName} style={newStyle} {...rest}>
            <Heading size="title" spacing="small" componentRef={compRef} marqueeOn='hover'>
                {feed.title}
            </Heading>
            <div style={{ height: `${itemHeight}px` }}>
                {itemHeight > 0 &&
                    <VirtualListNested
                        dataSize={feed.items.length}
                        itemRenderer={HomeFeedItem}
                        itemSize={itemWidth}
                        childProps={{
                            id: cellId,
                            feed,
                            itemSize: itemWidth,
                            onFocus: selectElement,
                            onClick: showContentDetail,
                            itemHeight,
                        }}
                        direction='horizontal'
                        verticalScrollbar='hidden'
                        horizontalScrollbar='hidden'
                        cbScrollTo={getScrollTo}
                    />
                }
            </div>
        </div>
    )
}

HomeFeedRow.propTypes = {
    feed: PropTypes.object.isRequired,
    itemSize: PropTypes.number.isRequired,
    cellId: PropTypes.string.isRequired,
    setContent: PropTypes.func.isRequired,
}

export default HomeFeedRow
