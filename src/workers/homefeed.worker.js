/* global self */

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
    return mergedFeed
}

self.onmessage = ({ data }) => {
    const { type, payload } = data

    try {
        let result
        if (type === 'legacy') {
            result = processLegacyHomefeed(payload)
        }
        self.postMessage({ result, success: true })
    } catch (e) {
        self.postMessage({ error: e.message, success: false })
    }
}
