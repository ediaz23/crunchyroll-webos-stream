
import { useEffect, useCallback, useRef } from 'react'

import api from '../api'
import { $L } from './language'
import { LOAD_MOCK_DATA } from '../const'
import logger from '../logger'
import kidImg from '../../assets/img/child.jpg'
import { isPlayable } from '../utils'


const HomeFeedWorker = new URL('../workers/homefeed.worker.js', import.meta.url)

/**
 * @typedef FeedItemType
 * @type {Object}
 * @property {Number} index
 * @property {Array} items
 * @property {String} response_type
 * @property {String} resource_type
 */

/**
 * Convert a link with short link into object with data
 * @param {{link: String}} item
 * @returns {Promise<Object>}
 */
const convertItem2Object = async (item) => {
    let out = null
    try {
        if (item.slug || item.resource_type === 'in_feed_banner' || item.type === 'Banner') {
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
        if (type === 'music' || carousel.items[0].link.includes('/artist/')) {
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
const processPanels = async (carousel) => {
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
const processCuratedCollection = async (carousel, profile) => {
    let res = {}
    if ('artist' === carousel.response_type) {
        res = await api.music.getArtists(profile, carousel.ids)
    } else if ('music_concert' === carousel.response_type) {
        res = await api.music.getConcerts(profile, carousel.ids)
    } else if ('music_video' === carousel.response_type) {
        if (LOAD_MOCK_DATA) {
            carousel.ids = 'MV22070F02-MV368FAEDE-MV3B1C3E43-MV4C1B0ED5-MV5FEC0BEB-MVAF86FF64'.split('-')
        }
        res = await api.music.getVideos(profile, carousel.ids)
    } else {
        if (LOAD_MOCK_DATA) {
            carousel.ids = 'G24H1N3MP_G65VQD2D6_G6NQ5DWZ6_G6W4QKX0R_GG5H5XQX4_GJ0H7QGQK'.split('-')
        }
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
    const quantity = LOAD_MOCK_DATA ? 20 : 30  // 20 beacuse all mock data is with 20
    const ratings = true
    if ('history' === carousel.response_type) {
        res = await api.discover.getHistory(profile, { quantity, ratings })
        res = { data: res.data.map(removePanelField) }
    } else if ('watchlist' === carousel.response_type) {
        res = await api.discover.getWatchlist(profile, { quantity, ratings })
        res = { data: res.data.map(removePanelField) }
    } else if ('recommendations' === carousel.response_type) {
        res = await api.discover.getRecomendation(profile, { quantity, ratings })
    } else if ('because_you_watched' === carousel.response_type) {
        res = await api.discover.getSimilar(profile, { quantity, ratings, contentId: carousel.source_media_id })
    } else if ('recent_episodes' === carousel.response_type) {
        res = await api.discover.getBrowseAll(profile, { quantity, ratings, type: 'episode', sort: 'newly_added' })
        const added = new Set()
        res = {
            data: res.data.filter(val => {
                let out = true
                if (val.type === 'episode') {
                    if (val.images && Object.keys(val.images).length) {
                        out = !added.has(val.episode_metadata.series_id)
                        added.add(val.episode_metadata.series_id)
                    } else {
                        out = false
                    }
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
    } else if ('personalization' === carousel.response_type) {
        res = await api.discover.getPersonalRecomendation(profile, { collectionId: carousel.analyticsId, ratings })
        res = { data: res.recommendations }
    } else {
        new Error(`Dynamic Collection not supported ${carousel.resource_type} - ${carousel.response_type}`)
    }
    return { resource_type: 'dynamic_collection', ...carousel, items: res.data }
}

/**
 * @param {Object} val
 * @returns {Promise<Object>}
 */
const postProcessFeedItem = async (val) => {
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
const processItemFeedLegacy = async (carousel, profile, type) => {
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
 * Process a single item in feed
 * @param {HomefeedItem} feedItem
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<Object>}
 */
const processItemFeedNew = async (feedItem, profile, type) => {
    feedItem = { ...feedItem }
    let res = Promise.resolve(feedItem), response_type
    const responseTypeMap = {
        PersonalizedCollection: 'personalization',
        HistoryCollection: 'history',
        WatchlistCollection: 'watchlist',
        RecentEpisodesCollection: 'recent_episodes',
        MediaCard: 'generic_card',
        HeroCollection: 'generic_card',
        HeroMediaCard: 'generic_card',
        MusicVideoCollection: 'music_video',
    }

    if (['PersonalizedCollection',
        'HistoryCollection',
        'WatchlistCollection',
        'RecentEpisodesCollection'].includes(feedItem.type)) {
        response_type = responseTypeMap[feedItem.type]
        res = processDynamicCollection({ ...feedItem, response_type }, profile, type)
    } else if (['MediaCard', 'HeroCollection', 'HeroMediaCard', 'MusicVideoCollection'].includes(feedItem.type)) {
        response_type = responseTypeMap[feedItem.type]
        feedItem.title = feedItem.title || $L('Watch Now')
        res = processCuratedCollection({ ...feedItem, response_type, ids: feedItem.contentIds }, profile)
    } else if ('Banner' === feedItem.type) {
        res = processCarousel(feedItem, profile, type).then(res2 => {
            feedItem.title = res2.title
            feedItem.items = res2.items
            return feedItem
        })
    } else {
        logger.error(`Feed not supported ${feedItem.type}, ${feedItem.id}, ${feedItem.title}`)
        return Promise.reject()
    }
    return res.then(async res2 => {
        if (res2.items) {
            res2.items = await Promise.all(res2.items.map(postProcessFeedItem))
        }
        if (res2.items && res2.items.length) {
            res2.resource_type = isPlayable(res2.items[0].type) ? 'dynamic_collection' : null
        } else {
            res2.resource_type = null  // almost not be dynamic_collection
        }
        return res2
    }).catch(e => {
        logger.error('Feed new')
        console.log(e)
    })
}

/**
 * Process a single item in feed
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<FeedItemType>}
 */
export const processItemFeed = async (carousel, profile, type, homeFeedType) => {
    const fn = homeFeedType === 'legacy' ? processItemFeedLegacy : processItemFeedNew
    return fn(carousel, profile, type)
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
    }
}


/**
 * @typedef HomefeedItem
 * @type {Object}
 * @property {String} id
 * @property {String} type
 * @property {String} title
 * @property {String} description
 * @property {String} analyticsId
 * @property {Array<String>} contentIds
 * @property {Array<HomefeedItem>} items
 * @property {String} contentId
 * @property {String} link
 */

/**
 * @callback ProcessHomeFeedCallBack
 * @param {Object} obj
 * @param {Array<{resource_type: String}>} obj.data
 * @returns {Promise<{id: Number, items: Array}>}
 */

/**
 * @returns {ProcessHomeFeedCallBack}
 */
export function useHomeFeedWorker() {
    /** @type {{current: Worker} */
    const workerRef = useRef(null)

    /**
     * @type {ProcessHomeFeedCallBack}
     */
    const processHomeFeed = useCallback(async ({ data: payload, type }) => new Promise((res, rej) => {
        if (workerRef.current && payload) {
            /** @param {{data: {success: Boolean, result: Object, error: String}>}} */
            workerRef.current.onmessage = ({ data }) => {
                if (data.success) {
                    res(data.result)
                } else {
                    rej(new Error(data.error))
                }
            }
            workerRef.current.postMessage({ payload, type })
        } else {
            res({ id: Date.now(), items: [] })
        }
    }), [])

    useEffect(() => {
        workerRef.current = new window.Worker(HomeFeedWorker)
        return () => {
            workerRef.current.terminate()
        }
    }, [])

    return processHomeFeed
}
