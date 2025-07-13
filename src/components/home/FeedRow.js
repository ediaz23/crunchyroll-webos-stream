
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ri from '@enact/ui/resolution'
import Heading from '@enact/moonstone/Heading'
import Image from '@enact/moonstone/Image'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { useSetRecoilState, useRecoilValue } from 'recoil'

import { homeViewReadyState, isPremiumState } from '../../recoilConfig'
import api from '../../api'
import VirtualListNested from '../../patch/VirtualListNested'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContentNavigate } from '../../hooks/setContent'
import { processItemFeed } from '../../hooks/homefeedWorker'
import withNavigable from '../../hooks/navigable'
import { $L } from '../../hooks/language'
import { useViewBackup } from '../../hooks/viewBackup'
import { formatDurationMs, getDuration, getIsPremium, isPlayable } from '../../utils'
import css from './FeedRow.module.less'
import globalCss from '../Share.module.less'
import { DEV_FAST_SELECT, DEV_CONTENT_TYPE } from '../../const'

const NavigableDiv = withNavigable('div', '')


export const Poster = ({ item, image, itemSize, isPremium, ...rest }) => {
    rest.style.width = itemSize
    let progress = 0, duration = undefined, showPremium = false

    if (isPlayable(item.type)) {
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
                {isPlayable(item.type) &&
                    <div className={globalCss.progress} style={{ bottom: '1.8rem' }}>
                        <div style={{ width: `${progress}%` }} />
                    </div>
                }
            </Image>
            {isPlayable(item.type) && <div className={css.playButton} />}
            {isPlayable(item.type) &&
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
 * @typedef RowInfo
 * @type {Object}
 * @property {Number} feedId
 * @property {'home'|'music'} feedType
 * @property {{id: String, items: Array}} fakeItem
 * @property {Function} setContent
 * @property {'legacy'|'new'} homeFeedType
 *
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.cellId
 * @param {Number} obj.itemSize
 * @param {{id: String, items: Array, index: Number}} obj.feedRow
 * @param {RowInfo} obj.rowInfo
 * @param {String} obj.style
 * @param {String} obj.className
 */
const HomeFeedRow = ({ profile, cellId, itemSize, feedRow, rowInfo, style, className, ...rest }) => {
    const { feedType, feedId, fakeItem, setContent, homeFeedType } = rowInfo  // has to separte to avoid recall
    const [backState, viewBackupRef] = useViewBackup(`homeFeedRow-${feedType}-${feedId}`)
    /** @type {[import('../../hooks/homefeedWorker').FeedItemType, Function]} */
    const [feedData, setFeedData] = useState(null)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: {rowIndex: Number, columnIndex: Number}}} */
    const rowIndexRef = useRef(backState || {})
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)
    /** @type {[Number, Function]} */
    const [itemHeight, setItemHeight] = useState(0)
    /** @type {Number} */
    const itemWidth = ri.scale(320)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {Function} */
    const selectElement = useCallback((ev) => {
        if (feedData.id !== 'fake_item') {
            setContent(feedData.items[parseInt(ev.target.dataset.index)], feedRow.index)
        } else {
            setContent(null, feedRow.index)
        }
    }, [feedData, setContent, feedRow])

    const setContentNavigate = useSetContentNavigate()
    /** @type {Function} */
    const setLocalContent = useCallback((ev) => {
        /** @type {HTMLElement} */
        const parentElement = ev.target.closest(`#${cellId}`)
        const columnIndex = parseInt(parentElement.dataset.index)
        const content = feedData.items[columnIndex]
        if (feedData.id !== 'fake_item') {
            viewBackupRef.current = { rowIndex: feedRow.index, columnIndex }
            setContentNavigate({ content })
        }
    }, [feedData, feedRow, cellId, setContentNavigate, viewBackupRef])

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
                    let columnIndex = null
                    if (feedData.index === (rowIndexRef.current.rowIndex || 0)) {
                        columnIndex = rowIndexRef.current.columnIndex || 0
                    }
                    if (columnIndex !== null) {
                        setHomeViewReady(true)
                        if (feedData.resource_type === 'dynamic_collection') {
                            scrollToRef.current({ index: 0, animate: false, focus: true })
                        } else {
                            scrollToRef.current({ index: columnIndex, animate: false, focus: true })
                        }
                    }
                }
            }, 100)
        }
        return () => {
            clearInterval(interval)
        }
    }, [feedData, setHomeViewReady])

    useEffect(() => {
        if (feedData && DEV_FAST_SELECT && DEV_CONTENT_TYPE) {
            const testContent = {
                series: ['GJ0H7QGQK', 'GRDV0019R'],
                episode: ['GZ7UV13VE'],
                musicArtist: ['MA899F289'],
                musicConcert: ['MC413F8154'],
                musicVideo: ['MV22070F02']
            }
            const content = feedData.items.find(
                val => val.type === DEV_CONTENT_TYPE && testContent[DEV_CONTENT_TYPE].includes(val.id)
            )
            if (content) {
                setContentNavigate({ content })
            }
        }
    }, [feedData, setContentNavigate])


    useEffect(() => {
        const loadData = async () => {
            const cacheKey = `/home/${feedType}/${feedId}/${feedRow.index}`
            const feedItemCache = await api.utils.getCustomCache(cacheKey)
            if (feedItemCache) {
                setFeedData(feedItemCache)
            } else {
                try {
                    const newFeedItem = await processItemFeed(feedRow, profile, feedType, homeFeedType)
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
    }, [profile, feedRow, feedType, homeFeedType, feedId, fakeItem])

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
                            itemSize: itemWidth,
                            feed: feedData,
                            onFocus: selectElement,
                            onClick: setLocalContent,
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
    // required fields for virtualListNated
    id: PropTypes.string.isRequired,
    cellId: PropTypes.string.isRequired,
    itemSize: PropTypes.number.isRequired,
    // <-
    profile: PropTypes.object.isRequired,
    feedRow: PropTypes.object.isRequired,
    rowInfo: PropTypes.shape({
        feedId: PropTypes.number.isRequired,
        feedType: PropTypes.oneOf(['home', 'music']),
        fakeItem: PropTypes.object.isRequired,
        setContent: PropTypes.func.isRequired,
        homeFeedType: PropTypes.oneOf(['legacy', 'new']).isRequired,
    })
}

export default HomeFeedRow
