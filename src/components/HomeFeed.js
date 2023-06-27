import { useCallback, useEffect, useState } from 'react'
import { Column, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import Spinner from '@enact/moonstone/Spinner'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import HomeContentBanner from './HomeContentBanner'
import HomeFeedRow from './HomeFeedRow'
import VirtualListNested from '../patch/VirtualListNested'
import api from '../api'
import CONST from '../const'
import { getMockData } from '../mock-data/mockData'
import logger from '../logger'
import css from './HomeFeed.module.less'


/**
 * Convert a link with short link into object with data
 * @param {{link: String}} item
 * @returns {Promise<Object>}
 */
const convertItem2Object = async (item) => {
    let out = null
    try {
        const res = await api.expandURL(item.link)
        let split = res.url.split('/')
        if (split.length > 4) {
            out = split[4]
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
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @returns {Promise<Object>}
 */
const processCarousel = async (carousel, profile) => {
    const out = {
        id: carousel.id,
        resource_type: carousel.resource_type,
        response_type: carousel.response_type,
        display_type: carousel.display_type,
        title: $L('Watch Now'),
        items: []
    }
    if (__DEV__ && CONST.LOAD_MOCK_DATA) {
        const { data } = await getMockData('objects', 'G50UZ1N4G-GEXH3W49E-GK9U3D2VV-GRDV0019R-GZ7UV13VE')
        out.items = data
    } else {
        const objectIds = await Promise.all(carousel.items.map(convertItem2Object))
        const uniqueObjectIds = Array.from(new Set(objectIds.filter(item => !!item)))
        const { data } = await api.getObjects(profile, uniqueObjectIds)
        out.items = data
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
        display_type: carousel.panels[0].display_type,
        title: $L('May Like'),
        items: carousel.panels.map(removePanelField)
    }

    return out
}

/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Object>}
 */
const processInFeedPanels = async (carousel, profile) => {
    const out = {
        id: 'in_feed_panels',
        resource_type: carousel.panels[0].resource_type,
        response_type: carousel.panels[0].response_type,
        display_type: carousel.panels[0].display_type,
        title: $L('Why Not?'),
        items: []
    }
    if (__DEV__ && CONST.LOAD_MOCK_DATA) {
        const { data } = await getMockData('objects', 'G4PH0WEKE-GNVHKNPQ7-GY8DWQN5Y')
        out.items = data
    } else {
        const objectIds = await Promise.all(carousel.panels.map(convertItem2Object))
        const uniqueObjectIds = Array.from(new Set(objectIds.filter(item => !!item)))
        const { data } = await api.getObjects(profile, uniqueObjectIds)
        out.items = data
    }

    return out
}

/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Object>}
 */
const processCuratedCollection = async (carousel, profile) => {
    let res = {}
    if ('artist' === carousel.response_type) {
        res = await api.getMusicArtists(profile, carousel.ids)
    } else if ('music_concert' === carousel.response_type) {
        res = await api.getMusicConcerts(profile, carousel.ids)
    } else if ('music_video' === carousel.response_type) {
        res = await api.getMusicVideos(profile, carousel.ids)
    } else {
        res = await api.getObjects(profile, carousel.ids)
    }
    return { ...carousel, items: res.data }
}

/**
 * Process InFeedPanels item
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Object>}
 */
const processDynamicCollection = async (carousel, profile) => {
    let res = {}
    if ('history' === carousel.response_type) {
        res = await api.getHistory(profile, { quantity: 20 })
        res = { data: res.data.map(removePanelField) }
    } else if ('watchlist' === carousel.response_type) {
        res = await api.getWatchlist(profile, { quantity: 20 })
        res = { data: res.data.map(removePanelField) }
    } else if ('recommendations' === carousel.response_type) {
        res = await api.getRecomendation(profile, { quantity: 20 })
    } else if ('because_you_watched' === carousel.response_type) {
        res = await api.getSimilar(profile, { contentId: carousel.source_media_id, quantity: 20 })
    } else if ('recent_episodes' === carousel.response_type) {
        res = await api.getBrowseAll(profile, { type: 'episode', quantity: 20, sort: 'newly_added' })
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
        res = await api.getBrowseAll(profile, params)
    } else {
        new Error(`Dynamic Collection not supported ${carousel.resource_type} - ${carousel.response_type}`)
    }
    return { ...carousel, items: res.data }
}

/**
 * Process a single item in feed
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Object>}
 */
const processItemFeed = async (carousel, profile) => {
    let res = Promise.resolve(carousel)
    if (carousel.resource_type === 'hero_carousel') {
        res = processCarousel(carousel, profile)
    } else if (carousel.resource_type === 'panel') {
        res = processPanels(carousel)
    } else if (carousel.resource_type === 'in_feed_banner') {
        res = processInFeedPanels(carousel, profile)
    } else if (carousel.resource_type === 'curated_collection') {
        res = processCuratedCollection(carousel, profile)
    } else if (carousel.resource_type === 'dynamic_collection') {
        res = processDynamicCollection(carousel, profile)
    } else {
        new Error(`Feed not supported ${carousel.resource_type} - ${carousel.response_type}`)
    }
    return res
}

/**
 * Process the feed
 * @param {Array<{resource_type: String}>} feed
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Array<Object>>}
 */
const postProcessHomefeed = async (feed) => {
    const mergedFeed = []
    const panelObject = { resource_type: 'panel', panels: [] }
    const bannerObject = { resource_type: 'in_feed_banner', panels: [] }
    for (const item of feed) {
        if (item.resource_type === 'panel') {
            if (panelObject.panels.length === 0) {
                mergedFeed.push(panelObject)
            }
            panelObject.panels.push(item)
        } else if (item.resource_type === 'in_feed_banner') {
            if (bannerObject.panels.length === 0) {
                mergedFeed.push(bannerObject)
            }
            bannerObject.panels.push(item)
        } else {
            mergedFeed.push(item)
        }
    }
    return mergedFeed
}


const HomeFeed = ({ homefeed, profile }) => {

    /** @type {[Array<Object>, Function]} */
    const [feed, setFeed] = useState([])
    /** @type {[Array<Object>, Function]} */
    const [processFeed, setProcessFeed] = useState(new Array(homefeed.length))
    /** @type {[Object, Function]} */
    const [contentSelected, setContentSelected] = useState(null)
    const itemHeigth = ri.scale(270)

    const renderRow = useCallback(({ index, ...rest }) => {
        let out
        const feedItem = processFeed[index]
        if (feedItem) {
            out = (<HomeFeedRow feed={feedItem} setContent={setContentSelected} {...rest} />)
        } else {
            processItemFeed(feed[index], profile).then(newFeed => {
                setProcessFeed(prevArray => [
                    ...prevArray.slice(0, index),
                    newFeed,
                    ...prevArray.slice(index + 1)
                ])
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
    }, [feed, profile, processFeed, setProcessFeed])

    useEffect(() => { postProcessHomefeed(homefeed).then(setFeed) }, [homefeed, profile])

    return (
        <Column className={css.homeFeed}>
            <Cell size="50%">
                {contentSelected && <HomeContentBanner content={contentSelected} />}
            </Cell>
            <Cell>
                <VirtualListNested
                    className={css.feedList}
                    dataSize={feed.length}
                    itemRenderer={renderRow}
                    itemSize={itemHeigth}
                    childProps={{ id: 'rowFeed', cellId: 'cellFeed', itemSize: itemHeigth }}
                    direction='vertical'
                    verticalScrollbar='hidden'
                    horizontalScrollbar='hidden'
                />
            </Cell>
        </Column>
    )
}

HomeFeed.propTypes = {
    profile: PropTypes.object,
    homefeed: PropTypes.arrayOf(PropTypes.object),
}

export default HomeFeed
