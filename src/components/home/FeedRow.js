
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ri from '@enact/ui/resolution'
import Heading from '@enact/moonstone/Heading'
import Image from '@enact/moonstone/Image'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { useSetRecoilState, useRecoilValue } from 'recoil'

import api from '../../api'
import { $L } from '../../hooks/language'
import VirtualListNested from '../../patch/VirtualListNested'
import { homeViewReadyState, homePositionState, isPremiumState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContent'
import { processItemFeed } from '../../hooks/homefeedWorker'
import withNavigable from '../../hooks/navigable'
import { formatDurationMs, getDuration, getIsPremium } from '../../utils'
import css from './FeedRow.module.less'
import globalCss from '../Share.module.less'
import { DEV_FAST_SELECT, DEV_CONTENT_TYPE } from '../../const'

const NavigableDiv = withNavigable('div', '')


export const Poster = ({ item, image, itemSize, isPremium, ...rest }) => {
    /** @type {Array<String>} */
    const playableTypes = useMemo(() => ['episode', 'movie', 'musicConcert', 'musicVideo'], [])
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
/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {Number} obj.feedId
 * @param {'home'|'music'} obj.feedType
 * @param {{id: String, items: Array, index: Number}} obj.feedRow
 * @param {{id: String, items: Array}} obj.fakeItem
 * @param {Number} obj.itemSize
 * @param {String} obj.cellId
 * @param {Function} obj.setContent
 * @param {String} obj.style
 * @param {String} obj.className
 */
const HomeFeedRow = ({ profile, feedId, feedType, feedRow, fakeItem,
    itemSize, cellId, setContent, style, className, ...rest }) => {
    /** @type {[import('../../hooks/homefeedWorker').FeedItemType, Function]} */
    const [feedData, setFeedData] = useState(null)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
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
        if (feedData.id !== 'fake_item') {
            setContent(feedData.items[parseInt(ev.target.dataset.index)])
        } else {
            setContent(null)
        }
    }, [feedData, setContent])
    /** @type {Function} */
    const setContentNavagate = useSetContent()
    /** @type {Function} */
    const showContentDetail = useCallback((ev) => {
        /** @type {HTMLElement} */
        const parentElement = ev.target.closest(`#${cellId}`)
        const columnIndex = parseInt(parentElement.dataset.index)
        const content = feedData.items[columnIndex]
        if (feedData.id !== 'fake_item') {
            setContentNavagate({ content, rowIndex: feedData.index, columnIndex })
        }
    }, [feedData, cellId, setContentNavagate])

    const newStyle = useMemo(() => Object.assign({}, style, { height: itemSize, }), [style, itemSize])
    const newClassName = useMemo(() => `${className} ${css.homeFeedRow}`, [className])

    useEffect(() => {
        if (feedData && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect()
            setItemHeight(itemSize - boundingRect.height * 2)
        }
    }, [feedData, itemSize, setItemHeight])

    useEffect(() => {
        let interval = null
        if (feedData) {
            interval = setInterval(() => {
                if (scrollToRef.current) {
                    clearInterval(interval)
                    const columnIndex = feedData.index === homePosition.rowIndex ? homePosition.columnIndex : null
                    if (columnIndex !== null) {
                        setHomeViewReady(true)  // Promise.resolve().then(() => setHomeViewReady(true))
                        if (feedData.resource_type === 'dynamic_collection') {
                            scrollToRef.current({ index: 0, animate: false, focus: true })
                        } else {
                            scrollToRef.current({ index: columnIndex, animate: false, focus: true })
                        }
                    }
                }
            }, 100)
        }
        return () => clearInterval(interval)
    }, [feedData, homePosition, setHomeViewReady])

    useEffect(() => {
        if (feedData && DEV_FAST_SELECT && DEV_CONTENT_TYPE) {
            const testContent = {
                series: 'GJ0H7QGQK',
                episode: 'GZ7UV13VE',
                musicArtist: 'MA899F289',
                musicConcert: 'MC413F8154',
            }
            const content = feedData.items.find(
                val => val.type === DEV_CONTENT_TYPE && val.id === testContent[DEV_CONTENT_TYPE]
            )
            if (content) {
                setContentNavagate({
                    content,
                    rowIndex: 0,
                    columnIndex: feedData.items.findIndex(i => i === content)
                })
            }
        }
    }, [feedData, setContentNavagate])


    useEffect(() => {
        const loadData = async () => {
            const cacheKey = `/home/${feedType}/${feedId}/${feedRow.index}`
            const feedItemCache = await api.utils.getCustomCache(cacheKey)
            if (feedItemCache) {
                setFeedData(feedItemCache)
            } else {
                try {
                    const newFeedItem = await processItemFeed(feedRow, profile, feedType)
                    if (newFeedItem.items.length) {
                        setFeedData(newFeedItem)
                        if (newFeedItem.resource_type !== 'dynamic_collection') {
                            api.utils.saveCustomCache(cacheKey, newFeedItem, 3 * 60 * 60)  // 3h
                        }
                    } else {
                        setFeedData(fakeItem)
                    }
                } catch (_e) {
                    setFeedData(fakeItem)
                }
            }
        }
        loadData()
    }, [profile, feedId, feedType, feedRow, fakeItem])

    return (
        <div className={newClassName} style={newStyle} {...rest}>
            <Heading size="title" spacing="small" componentRef={compRef} marqueeOn='hover'>
                {feedData?.title || ''}
            </Heading>
            <div style={{ height: `${itemHeight}px` }}>
                {!feedData && <Spinner />}
                {feedData && itemHeight > 0 && (
                    <VirtualListNested
                        dataSize={feedData.items.length}
                        itemRenderer={HomeFeedItem}
                        itemSize={itemWidth}
                        childProps={{
                            id: cellId,
                            feed: feedData,
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
                )}
            </div>
        </div>
    )
}

HomeFeedRow.propTypes = {
    profile: PropTypes.object.isRequired,
    feedId: PropTypes.number.isRequired,
    feedType: PropTypes.oneOf(['home', 'music']),
    feedRow: PropTypes.object.isRequired,
    fakeItem: PropTypes.object.isRequired,
    itemSize: PropTypes.number.isRequired,
    cellId: PropTypes.string.isRequired,
    setContent: PropTypes.func.isRequired,
}

export default HomeFeedRow
