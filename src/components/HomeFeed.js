import { useEffect, useState } from 'react'
import { Column, Cell } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import { useRecoilState } from 'recoil'

import { homefeedBakState, homefeedProcessedState } from '../recoilConfig'
import HomeContentBanner from './HomeContentBanner'
import { stringifySorted } from '../utils'
import api from '../api'
import CONST from '../const'
import { getMockData } from '../mock-data/mockData'
import logger from '../logger'


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
const postProcessHomefeed = async (feed, profile) => {
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
    return (await Promise.all(mergedFeed.map(item => processItemFeed(item, profile))))
}

const HomeFeed = ({ homefeed, profile }) => {

    /** @type {[String, Function]} */
    const [homefeedBak, setHomefeedBak] = useRecoilState(homefeedBakState)
    /** @type {[Array<Object>, Function]} */
    const [feed, setFeed] = useRecoilState(homefeedProcessedState)
    /** @type {[Boolean, Function]}  */
    const [isLoading, setIsLoading] = useState(true)
    /** @type {[Object, Function]} */
    const [contentSelected, setContentSelected] = useState(null)

    useEffect(() => {
        const newHomefeedBak = stringifySorted({ homefeed })
        if (homefeedBak !== newHomefeedBak) {
            postProcessHomefeed(homefeed, profile).then(newFeed => {
                setHomefeedBak(newHomefeedBak)
                setFeed(newFeed)
                setIsLoading(false)
                setContentSelected(newFeed[0].items[0])
            })
        }
    }, [homefeed, profile, homefeedBak, setHomefeedBak, setFeed, setIsLoading, setContentSelected])

    return (
        <Column style={{ paddingLeft: '0.5rem' }}>
            <Cell size="50%">
                {contentSelected && <HomeContentBanner content={contentSelected} />}
            </Cell>
            <Cell>
                {isLoading ?
                    (<Spinner transparent centered>{$L('Loading...')}</Spinner>)
                    :
                    (
                        feed[0].items.map(item =>
                            <GridListImageItem
                                key={item.id}
                                caption={item.title}
                                source={(item.images.thumbnail || item.images.poster_tall)[0][5].source} />
                        )

                    )
                }
            </Cell>
        </Column>
    )
}

HomeFeed.propTypes = {
    profile: PropTypes.object,
    homefeed: PropTypes.arrayOf(PropTypes.object),
}

export default HomeFeed
