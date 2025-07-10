/* global self */

/**
 * @param {import('crunchyroll-js-api').Types.HomeItem} data
 * @param {import('crunchyroll-js-api').Types.HomeItem} parent
 * @returns {import('../hooks/homefeedWorker').HomefeedItem}
 */
function processNewHomefeed(data, parent) {
    /** @type {import('../hooks/homefeedWorker').HomefeedItem} */
    const newItem = {
        id: data.id,
        type: data.type,
        title: data.props.title,
        description: data.props.description,
        analyticsId: data.props.analyticsId,
        contentId: null,
        link: null,
        contentIds: [],
        items: data.children.map(i => processNewHomefeed(i, data)),
    }

    if (['HeroMediaLiveCard', 'HeroMediaCard', 'MediaCard'].includes(data.type)) {
        if (parent && parent.parentId || data.type !== 'HeroMediaLiveCard') {
            newItem.contentId = data.props.contentId
        }
    } else if (['PersonalizedCollection', 'Banner'].includes(data.type)) {
        newItem.link = data.props.link
    } else if (['MusicVideoCard'].includes(data.type)) {
        newItem.contentId = data.props.musicVideoId
    }
    const filteredItems = newItem.items.filter(item => (
        item.contentId ||
        item.link ||
        item.items.length > 0 ||
        [
            'WatchlistCollection',
            'HistoryCollection',
            'RecentEpisodesCollection',
            'MusicVideoCollection'
        ].includes(item.type)
    ))
    if (filteredItems.length !== newItem.items.length) {
        console.log('homefeedWorker', 'filtered', newItem.items.filter(i => !filteredItems.includes(i)))
    }
    newItem.items = filteredItems
    return newItem
}

/**
 * @param {import('../hooks/homefeedWorker').HomefeedItem} data
 */
function mergeNewHomefeed(data) {
    /** @type {Object.<string, Array<import('../hooks/homefeedWorker').HomefeedItem>>} */
    const cards = {}
    /** @type {Object.<string, import('../hooks/homefeedWorker').HomefeedItem>} */
    const headerCards = {}
    /** @type {Array<String>} */
    const cardTypes = []
    for (const item of data.items) {
        if (item.type.endsWith('Card') || item.type.endsWith('Banner')) {
            if (!(item.type in cards)) {
                cards[item.type] = []
                headerCards[item.type] = item
                cardTypes.push(item.type)
            }
            cards[item.type].push(item)
        }
        item.contentIds = item.items.map(i => i.contentId).filter(i => !!i)
    }
    for (const cardType of cardTypes) {
        cards[cardType][0] = Object.assign({}, cards[cardType][0])
        headerCards[cardType].id = cardType
        headerCards[cardType].title = null
        headerCards[cardType].description = null
        headerCards[cardType].contentId = null
        headerCards[cardType].link = null
        headerCards[cardType].items = cards[cardType]
        headerCards[cardType].contentIds = cards[cardType].map(i => i.contentId).filter(i => !!i)
    }
    data.id = Date.now()
    data.items = data.items.filter(item => {
        if (item.type.endsWith('Card') || item.type.endsWith('Banner')) {
            return item.id === item.type
        }
        return true
    })
    data.items.forEach((item, index) => { item.index = index })
    return data
}

/**
 * Process the feed
 * @param {Object} obj
 * @param {Array<{resource_type: String}>} obj.data
 * @return {Promise<Array<Object>>}
 */
function processLegacyHomefeed({ data }) {
    const mergedFeed = []
    const panelObject = { resource_type: 'panel', panels: [] }
    const bannerObject = { resource_type: 'in_feed_banner', panels: [] }
    const musicArtistObject = { resource_type: 'music_artist_banner', panels: [] }
    for (let item of data.filter(i => i.response_type !== 'news_feed')) {
        if (item.resource_type === 'panel') {
            // find one panel then add to panelObject
            // only if not added before
            if (panelObject.panels.length === 0) {
                mergedFeed.push(panelObject)
            }
            let newItem = { panel: item.panel }
            if (panelObject.panels.length === 0) {
                Object.assign(newItem, {
                    resource_type: item.resource_type,
                    response_type: item.response_type,
                })
            }
            panelObject.panels.push(newItem)
        } else if (item.resource_type === 'in_feed_banner') {
            if (bannerObject.panels.length === 0) {
                mergedFeed.push(bannerObject)
            }
            let newItem = {
                resource_type: item.resource_type,
                link: item.link,
            }
            if (bannerObject.panels.length === 0) {
                Object.assign(newItem, {
                    id: item.id,
                    response_type: item.response_type,
                })
            }
            bannerObject.panels.push(newItem)
        } else if (item.resource_type === 'musicArtist') {
            if (musicArtistObject.panels.length === 0) {
                mergedFeed.push(musicArtistObject)
            }
            let newItem = { object: item.object }
            if (musicArtistObject.panels.length === 0) {
                Object.assign(newItem, {
                    id: item.id,
                    resource_type: item.resource_type,
                    response_type: item.response_type,
                })
            }
            musicArtistObject.panels.push(newItem)
        } else {
            let newItem = {
                id: item.id,
                resource_type: item.resource_type,
                response_type: item.response_type,
            }
            if (item.resource_type === 'hero_carousel') {
                newItem.items = item.items.map(i => {
                    return {
                        slug: i.slug,
                        link: i.link,
                    }
                })
            } else if (item.resource_type === 'curated_collection') {
                Object.assign(newItem, {
                    title: item.title,
                    ids: item.ids,
                })
                if (item.collection_items) {
                    newItem.ids = item.collection_items.map(i => i.id)
                }
            } else if (item.resource_type === 'dynamic_collection') {
                Object.assign(newItem, {
                    title: item.title,
                    source_media_id: item.source_media_id,
                    query_params: item.query_params,
                })
            } else {
                Object.assign(newItem, item)
            }
            mergedFeed.push(newItem)
        }
    }
    mergedFeed.forEach((item, index) => { item.index = index })
    return { id: Date.now(), items: mergedFeed }
}

self.onmessage = ({ data }) => {
    const { type, payload } = data

    try {
        let result
        if (type === 'legacy') {
            result = processLegacyHomefeed(payload)
        } else {
            result = mergeNewHomefeed(processNewHomefeed(payload))
        }
        self.postMessage({ result, success: true })
    } catch (e) {
        console.error(e)
        self.postMessage({ error: e.message, success: false })
    }
}
