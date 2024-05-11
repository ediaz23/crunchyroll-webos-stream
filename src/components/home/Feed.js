
import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { Column, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'
import { useRecoilValue } from 'recoil'

import { $L } from '../../hooks/language'
import { homePositionState } from '../../recoilConfig'
import HomeContentBanner from './ContentBanner'
import HomeFeedRow from './FeedRow'
import VirtualListNested from '../../patch/VirtualListNested'
import api from '../../api'
import { LOAD_MOCK_DATA } from '../../const'
import logger from '../../logger'
import kidImg from '../../../resources/img/child.jpg'


/**
 * Convert a link with short link into object with data
 * @param {{link: String}} item
 * @returns {Promise<Object>}
 */
export const convertItem2Object = async (item) => {
    let out = null
    try {
        if (item.slug || item.resource_type === 'in_feed_banner') {
            const res = await api.utils.fetchAuth(item.link)
            if (res.url.startsWith('https://www.crunchyroll.com/')) {
                let split = res.url.split('/')
                if (split.length > 1) {
                    out = split[split.length - 2]
                }
            }
        }
    } catch (e) {
        logger.error(e)
    }
    return out
}

/**
 * Remove panel
 * @param {Object} panel
 * @returns {Object}
 */
const removePanelField = (panel) => {
    const newPanel = Object.assign({}, panel, panel.panel)
    delete newPanel.panel
    return newPanel
}

/**
 * Process Carousel item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @returns {Promise<Object>}
 */
const processCarousel = async (carousel, profile, type) => {
    const out = {
        id: carousel.id,
        resource_type: carousel.resource_type,
        response_type: carousel.response_type,
        title: $L('Watch Now'),
        items: [],
    }
    /** @type {Array<String>} */
    let objectIds
    if (LOAD_MOCK_DATA) {
        if (type === 'music') {
            objectIds = 'MA6065CF47-MAB4DFE372-MA2D4BF4A9-MA6480DAB5-MA464307C7'.split('-')
        } else {
            objectIds = 'G50UZ1N4G-GEXH3W49E-GK9U3D2VV-GRDV0019R-GZ7UV13VE'.split('-')
        }
    } else {
        const resObjectIds = await Promise.all(carousel.items.map(convertItem2Object))
        objectIds = Array.from(new Set(resObjectIds.filter(item => !!item)))
    }
    if (objectIds.length) {
        if (type === 'music') {
            out.items = (await api.music.getArtists(profile, objectIds)).data
        } else {
            out.items = (await api.cms.getObjects(profile, { objectIds, ratings: true })).data
        }
    }
    return out
}

/**
 * Process Panels item
 * @param {Object} carousel
 * @return {Promise<Object>}
 */
export const processPanels = async (carousel) => {
    const out = {
        id: 'panels',
        resource_type: carousel.panels[0].resource_type,
        response_type: carousel.panels[0].response_type,
        title: $L('May Like'),
        items: carousel.panels.map(removePanelField),
    }

    return out
}

/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<Object>}
 */
const processInFeedPanels = async (carousel, profile, type) => {
    const out = {
        id: 'in_feed_panels',
        resource_type: carousel.panels[0].resource_type,
        response_type: carousel.panels[0].response_type,
        title: $L('Why Not?'),
        items: [],
    }
    /** @type {Array<String>} */
    let objectIds
    if (LOAD_MOCK_DATA) {
        if (type === 'music') {
            objectIds = 'MA7AFECB5F-MA179CB50D-MA29ED68B'.split('-')
        } else {
            objectIds = 'G4PH0WEKE-GNVHKNPQ7-GY8DWQN5Y'.split('-')
        }
    } else {
        const resOjectIds = await Promise.all(carousel.panels.map(convertItem2Object))
        objectIds = Array.from(new Set(resOjectIds.filter(item => !!item)))
    }
    if (objectIds.length) {
        if (type === 'music') {
            out.items = (await api.music.getArtists(profile, objectIds)).data
        } else {
            out.items = (await api.cms.getObjects(profile, { objectIds, ratings: true })).data
        }
    }
    return out
}

/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @return {Promise<Object>}
 */
const processMusicArtistBanner = async (carousel) => {
    const out = {
        id: 'music_artist_banner',
        resource_type: carousel.panels[0].resource_type,
        response_type: carousel.panels[0].response_type,
        title: $L('Artits'),
        items: carousel.panels.map(item => item.object)
    }
    return out
}


/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<Object>}
 */
export const processCuratedCollection = async (carousel, profile) => {
    let res = {}
    if ('artist' === carousel.response_type) {
        res = await api.music.getArtists(profile, carousel.ids)
    } else if ('music_concert' === carousel.response_type) {
        res = await api.music.getConcerts(profile, carousel.ids)
    } else if ('music_video' === carousel.response_type) {
        res = await api.music.getVideos(profile, carousel.ids)
    } else {
        res = await api.cms.getObjects(profile, { objectIds: carousel.ids, ratings: true })
    }
    return { ...carousel, items: res.data }
}

/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<Object>}
 */
const processDynamicCollection = async (carousel, profile) => {
    let res = {}
    if ('history' === carousel.response_type) {
        res = await api.discover.getHistory(profile, { quantity: 20, ratings: true })
        res = { data: res.data.map(removePanelField) }
    } else if ('watchlist' === carousel.response_type) {
        res = await api.discover.getWatchlist(profile, { quantity: 20, ratings: true })
        res = { data: res.data.map(removePanelField) }
    } else if ('recommendations' === carousel.response_type) {
        res = await api.discover.getRecomendation(profile, { quantity: 20, ratings: true })
    } else if ('because_you_watched' === carousel.response_type) {
        res = await api.discover.getSimilar(profile, { contentId: carousel.source_media_id, quantity: 20, ratings: true })
    } else if ('recent_episodes' === carousel.response_type) {
        res = await api.discover.getBrowseAll(profile, { type: 'episode', quantity: 20, sort: 'newly_added', ratings: true })
        const added = new Set()
        res = {
            data: res.data.filter(val => {
                let out = true
                if (val.type === 'episode') {
                    out = !added.has(val.episode_metadata.series_id)
                    added.add(val.episode_metadata.series_id)
                }
                return out
            })
        }
    } else if ('browse' === carousel.response_type) {
        const hash = { q: 'quantity', season_tag: 'seasonTag', sort_by: 'sort' }
        const params = {}
        if (carousel.query_params) {
            for (const key of Object.keys(carousel.query_params)) {
                const newKey = hash[key] || key
                params[newKey] = carousel.query_params[key]
            }
        }
        params.ratings = true
        res = await api.discover.getBrowseAll(profile, params)
    } else {
        new Error(`Dynamic Collection not supported ${carousel.resource_type} - ${carousel.response_type}`)
    }
    return { ...carousel, items: res.data }
}

/**
 * @param {Object} val
 * @returns {Promise<Object>}
 */
export const postProcessFeedItem = async (val) => {
    val = { ...val }
    if (val.title) {
        val.name = val.title
    }
    if (val.type === 'episode') {
        val.subTitle = val.title
        if (val.episode_metadata && val.episode_metadata.series_title) {
            val.name = `${val.episode_metadata.series_title} - ${val.title}`
            val.title = val.episode_metadata.series_title
        }
    } else if (['musicConcert', 'musicVideo'].includes(val.type)) {
        if (val.artist && val.artist.name) {
            val.subTitle = val.artist.name
        }
    } else if (val.type === 'musicArtist') {
        val.title = val.name
    }
    return val
}

/**
 * Process a single item in feed
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<Object>}
 */
const processItemFeed = async (carousel, profile, type) => {
    carousel = { ...carousel }
    let res = Promise.resolve(carousel)
    if (carousel.resource_type === 'hero_carousel') {
        res = processCarousel(carousel, profile, type)
    } else if (carousel.resource_type === 'panel') {
        res = processPanels(carousel, profile, type)
    } else if (carousel.resource_type === 'in_feed_banner') {
        res = processInFeedPanels(carousel, profile, type)
    } else if (carousel.resource_type === 'curated_collection') {
        res = processCuratedCollection(carousel, profile, type)
    } else if (carousel.resource_type === 'dynamic_collection') {
        res = processDynamicCollection(carousel, profile, type)
    } else if (carousel.resource_type === 'music_artist_banner') {
        res = processMusicArtistBanner(carousel, profile, type)
    } else {
        logger.error(`Feed not supported ${carousel.resource_type} - ${carousel.response_type}`)
        return Promise.reject()
    }
    return res.then(async res2 => {
        if (res2.items) {
            res2.items = await Promise.all(res2.items.map(postProcessFeedItem))
        }
        return res2
    }).catch(e => {
        logger.error('Feed')
        console.log(e)
    })
}

/**
 * Return fake item
 * @returns {Object}
 */
export const getFakeFeedItem = () => {
    return {
        "id": "fake_item",
        "title": $L('Keep Watching'),
        "items": [
            {
                "images": {
                    "poster_wide": [
                        [
                            {
                                "height": 180,
                                "source": kidImg,
                                "type": "poster_wide",
                                "width": 300
                            }
                        ]
                    ]
                },
                "id": "none",
                "type": "none",
                "title": $L('Keep Watching'),
                "name": $L('Keep Watching')
            }
        ],
        "processed": true
    }
}

const HomeFeed = ({ profile, homeFeed, setHomeFeed, type, ...rest2 }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useState(null)
    /** @type {{rowIndex: Number, columnIndex: Number}} */
    const homePosition = useRecoilValue(homePositionState)
    /** @type {Number} */
    const itemHeigth = ri.scale(270)
    /** @type {Object} */
    const fakeItem = useMemo(getFakeFeedItem, [])
    /** @type {Function} */
    const renderRow = useCallback(({ index, ...rest }) => {
        let out
        const feedItem = homeFeed[index]
        if (feedItem.processed) {
            out = (
                <HomeFeedRow
                    feed={feedItem}
                    rowIndex={index}
                    setContent={setSelectedContent}
                    {...rest} />
            )
        } else {
            Promise.resolve().then(() => {
                if (feedItem.processed === undefined) {
                    setHomeFeed(index, { ...feedItem, processed: false })  // avoid double request
                    processItemFeed(homeFeed[index], profile, type).then(newFeed => {
                        if (newFeed.items.length) {
                            setHomeFeed(index, { ...newFeed, processed: true })
                        } else {
                            setHomeFeed(index, fakeItem)
                        }
                    }).catch(() => setHomeFeed(index, fakeItem))
                }
            })
            const { itemSize } = rest
            delete rest.itemSize
            delete rest.cellId
            out = (
                <div {...rest} style={{ height: itemSize }}>
                    <Spinner />
                </div>
            )
        }
        return out
    }, [homeFeed, profile, type, setSelectedContent, setHomeFeed, fakeItem])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                scrollToRef.current({ index: homePosition.rowIndex, animate: false, focus: false })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [homePosition.rowIndex])

    return (
        <Column style={{ paddingLeft: '0.5rem' }} {...rest2}>
            <Cell size="47%">
                {selectedContent && <HomeContentBanner content={selectedContent} noCategory />}
            </Cell>
            <Cell>
                <VirtualListNested
                    dataSize={homeFeed.length}
                    itemRenderer={renderRow}
                    itemSize={itemHeigth}
                    childProps={{
                        id: 'rowFeed',
                        cellId: 'cellFeed',
                        itemSize: itemHeigth
                    }}
                    direction='vertical'
                    verticalScrollbar='hidden'
                    horizontalScrollbar='hidden'
                    cbScrollTo={getScrollTo}
                />
            </Cell>
        </Column>
    )
}

HomeFeed.propTypes = {
    profile: PropTypes.object.isRequired,
    homeFeed: PropTypes.arrayOf(PropTypes.object).isRequired,
    setHomeFeed: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['home', 'music']).isRequired,
}

HomeFeed.defaultProps = {
    type: 'home'
}

export default HomeFeed
