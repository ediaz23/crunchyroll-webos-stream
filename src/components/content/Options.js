
import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import Spinner from '@enact/moonstone/Spinner'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import PropTypes from 'prop-types'

import EpisodesList from './EpisodesList'
import ContentListPoster from '../ContentListPoster'
import { $L } from '../../hooks/language'
import { useProcessMusicVideos } from '../../hooks/processMusicVideos'
import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import Scroller from '../../patch/Scroller'
import { calculatePlayheadProgress } from './Seasons'
import { ContentHeader } from '../home/ContentBanner'
import PopupMessage from '../Popup'
import api from '../../api'
import back from '../../back'
import css from './ContentDetail.module.less'
import { contentDetailBakState, contentDetailBackupState, contentDetailPositionState } from '../../recoilConfig'
import { useReplaceSelectedContent } from '../../hooks/setContent'


const useChangeActivity = (setIndex, index) => {
    /** @type {Function} */
    const setContentDetailBak = useSetRecoilState(contentDetailBakState)
    return event => {
        /** @type {Event} */
        const ev = event
        const target = ev.currentTarget || ev.target
        back.pushHistory({
            doBack: () => {
                setIndex(0)
                setContentDetailBak({ optionIndex: target.id })
            }
        })
        setIndex(index)
    }
}

/**
 * MusicList
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {Object} obj.content
 * @param {Function} obj.onLoadData
 * @param {String} obj.optionIndex
 * @param {Function} obj.setContentToPlay
 */
const MusicList = ({ profile, content, onLoadData, optionIndex, setContentToPlay }) => {

    /** @type {[Array<Object>, Function]} */
    const [videos, setVideos] = useState(null)
    /** @type {[Number, Function]} */
    const [videoIndex, setVideoIndex] = useState(null)
    /** @type {Function} */
    const processVideos = useProcessMusicVideos()

    /** @type {Function} */
    const playMusicContent = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        setContentToPlay(videos[index], { optionIndex })
    }, [setContentToPlay, videos, optionIndex])

    /** @type {Function} */
    const loadMusic = useCallback(async (options) => {
        const music = await api.music.getFeatured(profile, {
            ...options,
            contentId: content.id,
            ratings: true
        })
        onLoadData(music)
        return music
    }, [profile, content, onLoadData])

    useBackVideoIndex(videos, setVideoIndex)

    useEffect(() => {
        setVideos(null)
        setVideoIndex(null)
    }, [optionIndex])

    useEffect(() => {
        loadMusic().then(res => setVideos(processVideos(res, res.data)))
    }, [profile, loadMusic, processVideos, setVideos])

    return (
        <EpisodesList
            seasonIndex={0}
            episodes={videos}
            selectEpisode={playMusicContent}
            episodeIndex={videoIndex} />
    )
}

/**
 * SimilarList
 * @fixme try to keep response to improve speed, now it is disabled for sync issues.
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {Object} obj.content
 * @param {Function} obj.onLoadData
 * @param {String} obj.optionIndex
 * @param {String} obj.rating
 */
const SimilarList = ({ profile, content, onLoadData, optionIndex, rating }) => {

    /** @type {Function} */
    const replaceSelectedContent = useReplaceSelectedContent()

    /** @type {Function} */
    const onSelectSimilar = useCallback(newContent => {
        const contentBak = { optionIndex, rating }
        replaceSelectedContent({ ...newContent, contentBak })
    }, [replaceSelectedContent, optionIndex, rating])

    /** @type {Function} */
    const loadSimilar = useCallback(async options => {
        const similar = await api.discover.getSimilar(profile, {
            ...options,
            contentId: content.id,
            ratings: true
        })
        onLoadData(similar)
        return similar
    }, [profile, content, onLoadData])

    return (
        <ContentListPoster
            profile={profile}
            loadData={loadSimilar}
            onSelect={onSelectSimilar}
            homeBackupOverride={contentDetailBackupState}
            homePositionOverride={contentDetailPositionState}
            type='similar'
            noPoster
            noSaveList
        />
    )
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
 * @property {String} moreDetail
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
    let description = content.description || '', watch = $L('Watch')
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
    return { watch, watchLast, description, moreDetail }
}

/**
 * get next episode
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<{firstEp: Object, lastEp: Object}>}
 */
export const getNextEpidose = async (profile, content) => {
    const out = { firstEp: null, lastEp: null }
    const { data: seasonsData } = await api.cms.getSeasons(profile, { serieId: content.id })
    const proms = [
        api.cms.getEpisodes(profile, { seasonId: seasonsData[0].id }).then(({ data: episodesData }) => {
            if (episodesData.length) {
                out.firstEp = episodesData[0]
                out.firstEp.type = 'episode'
            }
            return episodesData
        })
    ]
    if (seasonsData.length === 1) {
        proms[0].then(episodesData => {
            if (episodesData.length > 1) {
                out.lastEp = episodesData[episodesData.length - 1]
                out.lastEp.type = 'episode'
            }
        })
    } else {
        const seasonId = seasonsData[seasonsData.length - 1].id
        proms.push(api.cms.getEpisodes(profile, { seasonId }).then(({ data: episodesData }) => {
            if (episodesData.length) {
                out.lastEp = episodesData[episodesData.length - 1]
                out.lastEp.type = 'episode'
            }
        }))
    }
    return Promise.all(proms).then(async () => {
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
export const getNextMovie = async (profile, content) => {
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
export const getNextContent = async (profile, content) => {
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
            getNextProm = getNextEpidose(profile, content)
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

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @param {Function} obj.saveRating
 * @param {Function} obj.setIndex
 * @param {Function} obj.setContentToPlay
 */
const Options = ({ profile, content, saveRating, setIndex, setContentToPlay, ...rest }) => {
    /** @type {Object}  */
    const contentDetailBak = useRecoilValue(contentDetailBakState)
    /** @type {[String, Function]} */
    const [optionIndex, setOptionIndex] = useState(contentDetailBak.optionIndex)
    /** @type {[Number, Function]} */
    const [rating, setRating] = useState(contentDetailBak.rating || 0)
    /** @type {[Object, Function]} */
    const [nextContent, setNextConent] = useState(null)
    /** @type {[Object, Function]} */
    const [lastContent, setLastConent] = useState(null)
    /** @type {[Object, Function]} */
    const [isInWatchlist, setIsInWatchlist] = useState(false)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {[{type: String, message: String}, Function]}  */
    const [message, setMessage] = useState(null)
    /** @type {[String, Function]}  */
    const [spotlightRestrict, setSpotlightRestrict] = useState(null)
    /** @type {[String, Function]}  */
    const [subtitle, setSubtitle] = useState('\u00A0')
    /** @type {{current: Number}} */
    const optionRef = useRef(null)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {TitleObj} */
    const { watch, watchLast, description, moreDetail } = useMemo(() => {
        return computeTitles({ content, nextContent, lastContent })
    }, [content, nextContent, lastContent])
    /** @type {Function} */
    const moreEpisodes = useChangeActivity(setIndex, 1)
    /** @type {Function} */
    const changeAudio = useChangeActivity(setIndex, 2)
    /** @type {Function} */
    const playNextContent = useCallback(() => {
        setContentToPlay(nextContent)
    }, [setContentToPlay, nextContent])
    /** @type {Function} */
    const playLastContent = useCallback(() => {
        setContentToPlay(lastContent)
    }, [setContentToPlay, lastContent])

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

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
    }, [setOptionIndex, setSpotlightRestrict, nextContent, lastContent])

    /** @type {Function} */
    const updateRating = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const star = parseInt(target.dataset.star) + 1
        api.review.updateRating(profile, {
            contentId: content.id,
            contentType: content.type,
            rating: `${star}s`
        }).then(() => setRating(star))
    }, [profile, content])

    /** @type {Function}  */
    const onLoadMusic = useCallback(music => {
        if (optionRef.current === optionIndex && music.total > 0) {
            setSpotlightRestrict('music')
        }
    }, [setSpotlightRestrict, optionIndex])

    /** @type {Function} */
    const onLoadSimilar = useCallback(similar => {
        if (optionRef.current === optionIndex && similar.total > 0) {
            setSpotlightRestrict('similar')
        }
    }, [setSpotlightRestrict, optionIndex])

    useEffect(() => saveRating(rating), [rating, saveRating])
    useEffect(() => { optionRef.current = optionIndex }, [optionIndex])

    useEffect(() => {
        /** @type {Promise} */
        const nextEpProm = getNextContent(profile, content)
        /** @type {Array<Promise>} */
        const proms = [nextEpProm]
        if (['series', 'movie_listing'].includes(content.type)) {
            proms.push(
                api.content.getWatchlistItems(profile, {
                    contentIds: [content.id]
                }).then(res => setIsInWatchlist(res.total > 0))
            )
        }
        if (contentDetailBak.rating == null) {
            proms.push(
                api.review.getRatings(profile, {
                    contentId: content.id,
                    contentType: content.type,
                }).then(res => setRating(parseInt(res.rating.trimEnd('s'))))
            )
        }
        nextEpProm.then(tmpNextContent => {
            if (tmpNextContent.firstEp) {
                setNextConent(tmpNextContent.firstEp)
                setLastConent(tmpNextContent.lastEp)
            } else {
                setNextConent(tmpNextContent)
            }
        })
        setLoading(true)
        Promise.all(proms).then(() => setLoading(false))
    }, [profile, content, setLoading, contentDetailBak.rating])

    useEffect(() => {
        let interval = null
        if (!loading) {
            interval = setInterval(() => {
                const idSelector = `#${optionRef.current || 'play'}`
                if (document.querySelector(idSelector) && scrollToRef.current) {
                    clearInterval(interval)
                    scrollToRef.current({ node: document.querySelector(idSelector), animate: false, focus: true })
                }
            }, 100)
        }
        return () => clearInterval(interval)
    }, [loading])

    return (
        <Row align='start space-between' {...rest}>
            {loading &&
                <Column align='center center' style={{ height: '100%', width: '100%' }}>
                    <Spinner />
                </Column>
            }
            {!loading &&
                <Row style={{ width: '100%', height: '100%' }}>
                    <Cell size='49%' style={{ width: '49%', height: '100%' }}>
                        <Column style={{ height: '100%', width: '100%' }}>
                            <Cell size='32%' style={{ height: '32%', width: '100%' }}>
                                <ContentHeader content={content} />
                                <Heading size='small' spacing='small' className={css.firstData}>
                                    {subtitle}
                                </Heading>
                            </Cell>
                            <Cell size='15%' style={{ height: '15%', width: '100%' }}>
                                <div className={css.scrollerContainer}>
                                    <Scroller
                                        direction='vertical'
                                        horizontalScrollbar='hidden'
                                        verticalScrollbar='auto'
                                        focusableScrollbar>
                                        <BodyText size='small'>
                                            {description}
                                        </BodyText>
                                    </Scroller>
                                </div>
                            </Cell>
                            <Cell size="13%" style={{ height: '13%', width: '100%' }}>
                                <BodyText component='div' size='small' style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                    {Array.from({ length: 5 }, (_v, i) =>
                                        <IconButton size='small' key={i} data-star={i}
                                            onClick={updateRating}>
                                            {(i < rating) ? 'star' : 'hollowstar'}
                                        </IconButton>
                                    )}
                                </BodyText>
                            </Cell>
                            <Cell size='40%' style={{ height: '40%', width: '100%' }}>
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
                            </Cell>
                        </Column>
                    </Cell>
                    <Cell size='49%' style={{ width: '49%', height: '100%' }}>
                        {optionIndex === 'music' &&
                            <MusicList
                                profile={profile}
                                content={content}
                                onLoadData={onLoadMusic}
                                setContentToPlay={setContentToPlay}
                                optionIndex={optionIndex} />
                        }
                        {optionIndex === 'similar' &&
                            <SimilarList
                                profile={profile}
                                content={content}
                                onLoadData={onLoadSimilar}
                                optionIndex={optionIndex}
                                rating={rating}
                            />
                        }
                    </Cell>
                </Row>
            }
            <PopupMessage show={!!(message?.type)} type={message?.type}>
                {message?.message || 'nothing'}
            </PopupMessage>
        </Row>
    )
}

Options.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
    saveRating: PropTypes.func.isRequired,
    setIndex: PropTypes.func.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
}

export default Options
