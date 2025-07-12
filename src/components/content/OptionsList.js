
import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { Column } from '@enact/ui/Layout'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import Spinner from '@enact/moonstone/Spinner'

import { $L } from '../../hooks/language'
import back from '../../back'
import api from '../../api'

import Scroller from '../../patch/Scroller'
import PopupMessage from '../Popup'
import { calculatePlayheadProgress } from './Seasons'
import css from './ContentDetail.module.less'


/**
 * @param {Function} setIndex
 * @param {Number} index
 */
const useChangeActivity = (setIndex, index) => {
    return () => {
        back.pushHistory({
            doBack: () => {
                setIndex(0)
            }
        })
        setIndex(index)
    }
}

/**
 * @param {Object} content
 * @returns {String}
 */
const computeEpTitle = (content) => {
    let season = null, episodeNumber = null, watch = null
    if (content.episode_metadata) {
        season = content.episode_metadata.season_sequence_number
        episodeNumber = content.episode_metadata.episode_number
    } else {
        season = content.season_sequence_number
        episodeNumber = content.episode_number
    }
    if (episodeNumber != null) {
        watch = `${$L('Watch')} ${$L('Season')} ${season}: ${$L('E')} ${episodeNumber}`
    } else {
        watch = `${$L('Watch')} ${$L('Season')} ${season}: ${content.title || ''}`
    }
    return watch
}

/**
 * @param {Object} content
 * @returns {String}
 */
const computeEpSubTitle = (content) => {
    let episodeNumber = null, subtitle = null
    if (content.episode_metadata) {
        episodeNumber = content.episode_metadata.episode_number
    } else {
        episodeNumber = content.episode_number
    }
    if (episodeNumber != null) {
        subtitle = `${$L('Episode')} ${episodeNumber}: ${content.title || ''}`
    } else {
        subtitle = content.title || ''
    }
    return subtitle
}

/**
 * @typedef TitleObj
 * @type {Object}
 * @property {String} watch
 * @property {String} watchLast
 * @property {String} description
 */

/**
 * Compute titles
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Object} obj.nextContent
 * @param {Object} obj.lastContent
 * @returns {TitleObj}
 */
const computeTitles = ({ content, nextContent, lastContent }) => {
    let watch = $L('Watch')
    let moreDetail = '', watchLast = $L('Watch')

    if (nextContent) {
        if (nextContent.type === 'episode') {
            watch = computeEpTitle(nextContent)
            if (lastContent) {
                watchLast = computeEpTitle(lastContent)
            }
        } else if (nextContent.type === 'movie') {
            watch = `${$L('Watch')} ${nextContent.title || ''}`
        }
    }
    if (content.type === 'series') {
        moreDetail = $L('Episodes and more')
    } else if (content.type === 'movie_listing') {
        moreDetail = $L('Movies and more')
    }
    return { watch, watchLast, moreDetail }
}

/**
 * get next episode
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<{firstEp: Object, lastEp: Object}>}
 */
const getNextEpisode = async (profile, content) => {
    const out = { firstEp: null, lastEp: null }
    const { data: seasonsData } = await api.cms.getSeasons(profile, { serieId: content.id })

    return Promise.all([
        api.cms.getEpisodes(profile, { seasonId: seasonsData[0].id }),
        seasonsData.length > 1
            ? api.cms.getEpisodes(profile, { seasonId: seasonsData[seasonsData.length - 1].id })
            : Promise.resolve({ data: null })
    ]).then(async ([{ data: firstSeasonEp }, { data: lastSeasonEp }]) => {
        if (firstSeasonEp.length) {
            out.firstEp = firstSeasonEp[0]
            out.firstEp.type = 'episode'
            if (firstSeasonEp.length > 1) {
                out.lastEp = firstSeasonEp[firstSeasonEp.length - 1]
                out.lastEp.type = 'episode'
            }
        }
        if (lastSeasonEp?.length) {
            out.lastEp = lastSeasonEp[lastSeasonEp.length - 1]
            out.lastEp.type = 'episode'
        }
        const eps = [out.firstEp, out.lastEp].filter(ep => !!ep)
        if (eps.length > 0) {
            await calculatePlayheadProgress({ profile, episodesData: eps })
        }
        return out
    })
}

/**
 * get next movie
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
const getNextMovie = async (profile, content) => {
    const { data: moviesData } = await api.cms.getMovies(profile, { movieListingId: content.id })
    let tmpMovie = moviesData[0]
    tmpMovie.type = 'movie'
    tmpMovie = { ...tmpMovie, ...(tmpMovie.panel || {}), panel: null }
    await calculatePlayheadProgress({ profile, episodesData: [tmpMovie] })
    return tmpMovie
}

/**
 * get next content
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
const getNextContent = async (profile, content) => {
    return new Promise(resolve => {
        const nextProm = api.discover.getNext(profile, {
            contentId: content.id,
            contentType: content.type
        }).then(nextEp => {
            if (nextEp && nextEp.total > 0) {
                if (nextEp.data[0].type === 'movie') {
                    nextEp = { ...nextEp.data[0], ...nextEp.data[0].panel, panel: null }
                } else {
                    nextEp = nextEp.data[0]
                }
            } else {
                nextEp = null
            }
            return nextEp
        })
        /** @type {Promise} */
        let getNextProm = Promise.resolve(null)
        if (content.type === 'series') {
            getNextProm = getNextEpisode(profile, content)
        } else if (content.type === 'movie_listing') {
            getNextProm = getNextMovie(profile, content)
        }
        nextProm.then(nextEp => {
            if (nextEp) {
                resolve(nextEp)
            } else {
                getNextProm.then(resolve)
            }
        })
    })
}


const OptionsList = ({ profile, music, similar, contentState, optionIndexState, setSubtitle, setIndex }) => {
    const {optionIndex, setOptionIndex} = optionIndexState
    const {content, setContent} = contentState
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {[{type: String, message: String}, Function]}  */
    const [message, setMessage] = useState(null)
    /** @type {[Object, Function]} */
    const [nextContent, setNextConent] = useState(null)
    /** @type {[Object, Function]} */
    const [lastContent, setLastConent] = useState(null)
    /** @type {[Object, Function]} */
    const [isInWatchlist, setIsInWatchlist] = useState(false)
    /** @type {[String, Function]}  */
    const [spotlightRestrict, setSpotlightRestrict] = useState(null)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const optionRef = useRef(null)
    /** @type {TitleObj} */
    const { watch, watchLast, moreDetail } = useMemo(() => {
        return computeTitles({ content, nextContent, lastContent })
    }, [content, nextContent, lastContent])
    /** @type {Function} */
    const moreEpisodes = useChangeActivity(setIndex, 1)
    /** @type {Function} */
    const changeAudio = useChangeActivity(setIndex, 2)
    /** @type {Function} */
    const playNextContent = useCallback(() => {
        setContent(nextContent)
    }, [setContent, nextContent])
    /** @type {Function} */
    const playLastContent = useCallback(() => {
        setContent(lastContent)
    }, [setContent, lastContent])

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const selectOption = useCallback(event => {
        /** @type {Event} */
        const ev = event
        const target = ev.currentTarget || ev.target

        let newOption = null, currentContent = null
        if (ev.type === 'click' || (ev.type === 'keyup' && ev.key === 'Enter')) {
            newOption = target.id
        } else if (['music', 'similar'].includes(target.id)) {
            if (optionRef.current == null || optionRef.current !== target.id) {
                newOption = null
            } else {
                newOption = target.id
            }
        }
        if (optionRef.current !== newOption) {
            setOptionIndex(newOption)
        }
        setSpotlightRestrict(null)
        if (target.id === 'play-last') {
            currentContent = lastContent
        } else {
            currentContent = nextContent
        }
        if (currentContent) {
            if (currentContent.type === 'episode') {
                setSubtitle(computeEpSubTitle(currentContent) || '\u00A0')
            } else if (currentContent.type === 'movie') {
                setSubtitle(currentContent.title || '\u00A0')
            } else {
                setSubtitle('\u00A0')
            }
        } else {
            setSubtitle('\u00A0')
        }
    }, [setOptionIndex, setSpotlightRestrict, nextContent, lastContent, setSubtitle])

    /** @type {Function} */
    const toggleWatchlist = useCallback(() => {
        if (isInWatchlist) {
            api.content.deleteWatchlistItem(profile, { contentId: content.id })
        } else {
            api.content.addWatchlistItem(profile, { contentId: content.id })
        }
        setIsInWatchlist(prev => !prev)
    }, [profile, content, isInWatchlist, setIsInWatchlist])

    /** @type {Function} */
    const markAsWatched = useCallback(() => {
        api.discover.markAsWatched(profile, content.id)
            .then(() => setMessage({ type: 'info', message: $L('Marked as watched') }))
            .catch(err => {
                if (err) {
                    setMessage({ type: 'error', message: err.message || `${err}` })
                } else {
                    setMessage({ type: 'error', message: $L('An error occurred') })
                }
            }).finally(() => setTimeout(() => setMessage(null), 2000))
    }, [profile, content])

    /** @type {Function}  */
    useEffect(() => {  // onLoadMusic
        if (optionRef.current === optionIndex && music.total > 0) {
            setSpotlightRestrict('music')
        }
    }, [setSpotlightRestrict, optionIndex, music])

    /** @type {Function} */
    useEffect(() => {  // onLoadSimilar
        if (optionRef.current === optionIndex && similar.total > 0) {
            setSpotlightRestrict('similar')
        }
    }, [setSpotlightRestrict, optionIndex, similar])

    useEffect(() => {
        setLoading(true)
        Promise.all([
            getNextContent(profile, content),
            ['series', 'movie_listing'].includes(content.type)
                ? api.content.getWatchlistItems(profile, { contentIds: [content.id] })
                : null,
            api.review.getRatings(profile, { contentId: content.id, contentType: content.type, })
        ]).then(([nextEpRes, watchlistRes]) => {
            if (nextEpRes) {
                if (nextEpRes.firstEp) {
                    setNextConent(nextEpRes.firstEp)
                    setLastConent(nextEpRes.lastEp)
                } else {
                    setNextConent(nextEpRes)
                }
            }
            if (watchlistRes) {
                setIsInWatchlist(watchlistRes.total > 0)
            }
            setLoading(false)
        })
    }, [profile, content, setLoading])

    /** ### -> alike List component*/
    useEffect(() => {
        optionRef.current = optionIndex
    }, [optionIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            const idSelector = `#${optionRef.current || 'play'}`
            if (scrollToRef.current && !loading && document.querySelector(idSelector)) {
                clearInterval(interval)
                scrollToRef.current({ node: document.querySelector(idSelector), animate: false, focus: true })
            }
        }, 100)
        return () => {
            clearInterval(interval)
        }
    }, [loading])
    /** ### <- */

    return (<>
        {loading &&
            <Column align='center center' style={{ height: '100%', width: '100%' }}>
                <Spinner />
            </Column>
        }
        {!loading &&
            <div className={css.scrollerContainer}>
                <Scroller direction='vertical'
                    horizontalScrollbar='hidden'
                    verticalScrollbar='visible'
                    cbScrollTo={getScrollTo}>
                    {nextContent &&
                        <Item id='play' onClick={playNextContent} onFocus={selectOption}
                            spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'play'}>
                            <Icon>play</Icon>
                            <span>{watch}</span>
                        </Item>
                    }
                    {lastContent &&
                        <Item id='play-last' onClick={playLastContent} onFocus={selectOption}
                            spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'play-last'}>
                            <Icon>play</Icon>
                            <span>{watchLast}</span>
                        </Item>
                    }
                    <Item id='series' onClick={moreEpisodes} onFocus={selectOption}
                        spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'series'}>
                        <Icon>series</Icon>
                        <span>{moreDetail}</span>
                    </Item>
                    {['series', 'movie_listing'].includes(content.type) &&
                        <Item id='music' onClick={selectOption} onFocus={selectOption}
                            spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'music'}>
                            <Icon>music</Icon>
                            <span>{$L('Music')}</span>
                        </Item>
                    }
                    {['series', 'movie_listing'].includes(content.type) &&
                        <Item id='similar' onClick={selectOption} onFocus={selectOption}
                            spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'similar'}>
                            <Icon>search</Icon>
                            <span>{$L('Similar')}</span>
                        </Item>
                    }
                    {['series', 'movie_listing'].includes(content.type) &&
                        <Item id='list' onClick={toggleWatchlist} onFocus={selectOption}
                            spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'list'}>
                            <Icon>{isInWatchlist ? 'closex' : 'plus'}</Icon>
                            <span>{isInWatchlist ? $L('Remove from my list') : $L('Add to my list')}</span>
                        </Item>
                    }
                    {'series' === content.type &&
                        <Item id='watched' onClick={markAsWatched} onFocus={selectOption}
                            spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'watched'}>
                            <Icon>checkselection</Icon>
                            <span>{$L('Mark as watched')}</span>
                        </Item>
                    }
                    <Item id='audio' onClick={changeAudio} onFocus={selectOption}
                        spotlightDisabled={spotlightRestrict != null && spotlightRestrict !== 'audio'}>
                        <Icon>audio</Icon>
                        <span>{$L('Audio and Subtitles')}</span>
                    </Item>
                </Scroller>
            </div>
        }
        <PopupMessage show={!!(message?.type)} type={message?.type}>
            {message?.message || 'nothing'}
        </PopupMessage>
    </>)
}

export default OptionsList
