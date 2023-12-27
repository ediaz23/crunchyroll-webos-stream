
import { useCallback } from 'react'
import { Column, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import Spinner from '@enact/moonstone/Spinner'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import { useRecoilState, useSetRecoilState } from 'recoil'

import { musicFeedProcessedState, musicFeedState, selectedContentState, } from '../../recoilConfig'
import HomeContentBanner from '../home/ContentBanner'
import HomeFeedRow from '../home/FeedRow'
import { convertItem2Object, processCuratedCollection, postProcessFeedItem } from '../home/Feed'
import VirtualListNested from '../../patch/VirtualListNested'
import api from '../../api'
import { LOAD_MOCK_DATA } from '../../const'
import logger from '../../logger'


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
    /** @type {Array<String>} */
    let objectIds
    if (LOAD_MOCK_DATA) {
        objectIds = 'MA6065CF47-MAB4DFE372-MA2D4BF4A9-MA6480DAB5-MA464307C7'.split('-')
    } else {
        const resObjectIds = await Promise.all(carousel.items.map(convertItem2Object))
        objectIds = Array.from(new Set(resObjectIds.filter(item => !!item)))
    }
    /** @bug assume only are artis */
    if (objectIds.length) {
        const { data } = await api.music.getArtists(profile, objectIds)
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
const processInFeedPanels = async (carousel, profile) => {
    const out = {
        id: 'in_feed_panels',
        resource_type: carousel.panels[0].resource_type,
        response_type: carousel.panels[0].response_type,
        display_type: carousel.panels[0].display_type,
        title: $L('Why Not?'),
        items: []
    }
    /** @type {Array<String>} */
    let objectIds
    if (LOAD_MOCK_DATA) {
        objectIds = 'MA7AFECB5F-MA179CB50D-MA29ED68B'.split('-')
    } else {
        const resOjectIds = await Promise.all(carousel.panels.map(convertItem2Object))
        objectIds = Array.from(new Set(resOjectIds.filter(item => !!item)))
    }
    /** @bug assume only are artis */
    if (objectIds.length) {
        const { data } = await api.music.getArtists(profile, objectIds)
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
const processMusicCuratedCollection = async (carousel, profile) => {
    carousel.ids = carousel.collection_items.map(item => item.id)
    const out = await processCuratedCollection(carousel, profile)
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
        display_type: carousel.panels[0].display_type,
        title: $L('Artits'),
        items: carousel.panels.map(item => item.object)
    }
    return out
}


/**
 * Process a single item in feed
 * @param {Object} carousel
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise<Object>}
 */
const processItemFeed = async (carousel, profile) => {
    carousel = { ...carousel }
    let res = Promise.resolve(carousel)
    if (carousel.resource_type === 'hero_carousel') {
        res = processCarousel(carousel, profile)
    } else if (carousel.resource_type === 'in_feed_banner') {
        res = processInFeedPanels(carousel, profile)
    } else if (carousel.resource_type === 'curated_collection') {
        res = processMusicCuratedCollection(carousel, profile)
    } else if (carousel.resource_type === 'music_artist_banner') {
        res = processMusicArtistBanner(carousel, profile)
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
        logger.error('MusicFeedError')
        console.log(e)
    })
}


const MusicFeed = ({ profile, musicfeed }) => {
    /** @type {Function} */
    const setMusicfeed = useSetRecoilState(musicFeedState)
    /** @type {[Array<Object>, Function]} */
    const [musicFeedProcessed, setMusicFeedProcessed] = useRecoilState(musicFeedProcessedState)
    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useRecoilState(selectedContentState)
    /** @type {Number} */
    const itemHeigth = ri.scale(270)

    const renderRow = useCallback(({ index, ...rest }) => {
        let out
        const feedItem = musicFeedProcessed[index]
        if (feedItem) {
            out = (<HomeFeedRow feed={feedItem} index={index} setContent={setSelectedContent} {...rest} />)
        } else {
            Promise.resolve().then(() => {
                if (feedItem === undefined) {
                    setMusicFeedProcessed(prevArray => [
                        ...prevArray.slice(0, index),
                        false,  // avoid double request
                        ...prevArray.slice(index + 1)
                    ])
                    processItemFeed(musicfeed[index], profile).then(newFeed => {
                        if (newFeed.items.length) {
                            setMusicFeedProcessed(prevArray => [
                                ...prevArray.slice(0, index),
                                newFeed,
                                ...prevArray.slice(index + 1)
                            ])
                        } else {
                            setMusicfeed(prevArray => [...prevArray.slice(0, index), ...prevArray.slice(index + 1)])
                            setMusicFeedProcessed(prevArray => [...prevArray.slice(0, index), ...prevArray.slice(index + 1)])
                        }
                    }).catch(() => {
                        setMusicfeed(prevArray => [...prevArray.slice(0, index), ...prevArray.slice(index + 1)])
                        setMusicFeedProcessed(prevArray => [...prevArray.slice(0, index), ...prevArray.slice(index + 1)])
                    })
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
    }, [musicfeed, profile, musicFeedProcessed, setMusicFeedProcessed, setSelectedContent, setMusicfeed])

    return (
        <Column>
            <Cell size="50%">
                {selectedContent && <HomeContentBanner content={selectedContent} />}
            </Cell>
            <Cell>
                <VirtualListNested
                    dataSize={musicfeed.length}
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
                />
            </Cell>
        </Column>
    )
}

MusicFeed.propTypes = {
    profile: PropTypes.object.isRequired,
    musicfeed: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export default MusicFeed

