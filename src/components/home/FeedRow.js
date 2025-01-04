
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ri from '@enact/ui/resolution'
import Heading from '@enact/moonstone/Heading'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { useSetRecoilState, useRecoilValue } from 'recoil'

import { $L } from '../../hooks/language'
import VirtualListNested from '../../patch/VirtualListNested'
import { homeViewReadyState, homePositionState, isPremiumState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContent'
import withNavigable from '../../hooks/navigable'
import { formatDurationMs, getDuration, getIsPremium } from '../../utils'
import css from './FeedRow.module.less'
import globalCss from '../Share.module.less'
import { DEV_FAST_SELECT, DEV_CONTENT_TYPE } from '../../const'

const NavigableDiv = withNavigable('div', '')


export const Poster = ({ item, image, itemSize, isPremium, ...rest }) => {
    /** @type {Array<String>} */
    const playableTypes = useMemo(() =>
        ['episode', 'movie', 'musicConcert', 'musicVideo'], [])
    rest.style.width = itemSize
    let progress = 0, duration = undefined, showPremium = false

    if (playableTypes.includes(item.type)) {
        duration = getDuration(item)
        if (duration !== undefined && item.playhead !== undefined) {
            progress = item.playhead / (duration / 1000) * 100
        }
        if (!isPremium) {
            showPremium = getIsPremium(item)
        }
    }

    return (
        <NavigableDiv {...rest}>
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
            {showPremium && <div className={globalCss.contenPremium}>{$L('Premium')}</div>}
            <Heading size="small" marqueeOn='hover' >
                {item.name}
            </Heading>
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

const HomeFeedRow = ({ feed, itemSize, cellId, setContent, rowIndex, style, className, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const columnIndexRef = useRef(null)
    /** @type {{current: HTMLElement}} */
    const compRef = useRef({ current: null })
    /** @type {[Number, Function]} */
    const [itemHeight, setItemHeight] = useState(0)
    /** @type {Number} */
    const itemWidth = ri.scale(320)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {{rowIndex: Number, columnIndex: Number}} */
    const homePosition = useRecoilValue(homePositionState)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {Function} */
    const selectElement = useCallback((ev) => {
        if (feed.id !== 'fake_item') {
            setContent(feed.items[parseInt(ev.target.dataset.index)])
        } else {
            setContent(null)
        }
    }, [setContent, feed])
    /** @type {Function} */
    const setContentNavagate = useSetContent()
    /** @type {Function} */
    const showContentDetail = useCallback((ev) => {
        /** @type {HTMLElement} */
        const parentElement = ev.target.closest(`#${cellId}`)
        const columnIndex = parseInt(parentElement.dataset.index)
        const content = feed.items[columnIndex]
        if (feed.id !== 'fake_item') {
            setContentNavagate({ content, rowIndex, columnIndex })
        }
    }, [cellId, setContentNavagate, feed, rowIndex])

    const newStyle = useMemo(() => Object.assign({}, style, { height: itemSize, }), [style, itemSize])
    const newClassName = useMemo(() => `${className} ${css.homeFeedRow}`, [className])

    useEffect(() => {
        if (compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect()
            setItemHeight(itemSize - boundingRect.height * 2)
        }
    }, [itemSize, setItemHeight])

    useEffect(() => {
        if (rowIndex === homePosition.rowIndex) {
            columnIndexRef.current = homePosition.columnIndex
        } else {
            columnIndexRef.current = null
        }
    }, [rowIndex, homePosition])

    useEffect(() => {
        if (columnIndexRef.current !== null) {
            setHomeViewReady(true)
        }
    }, [setHomeViewReady])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                if (columnIndexRef.current !== null) {
                    scrollToRef.current({ index: columnIndexRef.current, animate: false, focus: true })
                }
            }
        }, 100)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (DEV_FAST_SELECT && DEV_CONTENT_TYPE) {
            const testContent = {
                series: 'GJ0H7QGQK',
                episode: 'GZ7UV13VE',
                musicArtist: 'MA899F289',
                musicConcert: 'MC413F8154',
            }
            const content = feed.items.find(val => val.type === DEV_CONTENT_TYPE &&
                val.id === testContent[DEV_CONTENT_TYPE])
            if (content) {
                setContentNavagate({
                    content,
                    rowIndex: 0,
                    columnIndex: feed.items.findIndex(i => i === content)
                })
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
                            isPremium,
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
    rowIndex: PropTypes.number.isRequired,
}

export default HomeFeedRow
