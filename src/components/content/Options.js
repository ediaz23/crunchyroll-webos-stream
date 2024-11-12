
import { useEffect, useCallback, useState, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Spotlight from '@enact/spotlight'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import Spinner from '@enact/moonstone/Spinner'
import { useSetRecoilState, useRecoilState } from 'recoil'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import Scroller from '../../patch/Scroller'
import { calculatePlayheadProgress } from './Seasons'
import { ContentHeader } from '../home/ContentBanner'
import api from '../../api'
import back from '../../back'
import css from './ContentDetail.module.less'
import { homePositionState, homeBackupState } from '../../recoilConfig'


const useChangeActivity = (setIndex, index) => {
    return () => {
        back.pushHistory({ doBack: () => { setIndex(0) } })
        setIndex(index)
    }
}

/**
 * @param {Object} content
 * @returns {{watch: String, subtitle: String}}
 */
const computeEpTitle = (content) => {
    let season = null, episodeNumber = null, watch = null, subtitle = null
    if (content.episode_metadata) {
        season = content.episode_metadata.season_sequence_number
        episodeNumber = content.episode_metadata.episode_number
    } else {
        season = content.season_sequence_number
        episodeNumber = content.episode_number
    }
    if (episodeNumber != null) {
        watch = `${$L('Watch')} ${$L('Season')} ${season}: ${$L('E')} ${episodeNumber}`
        subtitle = `${$L('Episode')} ${episodeNumber}: ${content.title || ''}`
    } else {
        watch = `${$L('Watch')} ${$L('Season')} ${season}: ${content.title || ''}`
        subtitle = content.title || ''
    }
    return { watch, subtitle }
}

/**
 * @typedef TitleObj
 * @type {Object}
 * @property {String} watch
 * @property {String} watchLast
 * @property {String} description
 * @property {String} subtitle
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
    let subtitle = '', description = content.description || '', watch = $L('Watch')
    let moreDetail = '', watchLast = $L('Watch')

    if (nextContent) {
        if (nextContent.type === 'episode') {
            const nextContentTitle = computeEpTitle(nextContent)
            watch = nextContentTitle.watch
            subtitle = nextContentTitle.subtitle
            if (lastContent) {
                watchLast = computeEpTitle(lastContent).watch
            }
        } else if (nextContent.type === 'movie') {
            watch = `${$L('Watch')} ${nextContent.title || ''}`
            subtitle = nextContent.title
        }
    }
    if (content.type === 'series') {
        moreDetail = $L('Episodes and more')
    } else if (content.type === 'movie_listing') {
        moreDetail = $L('Movies and more')
    }
    return { watch, watchLast, description, subtitle, moreDetail }
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
        api.cms.getEpisodes(profile, { seasonId: seasonsData[0].id })
            .then(({ data: episodesData }) => {
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
        proms.push(proms[0])
    } else {
        proms.push(
            api.cms.getEpisodes(profile, { seasonId: seasonsData[seasonsData.length - 1].id })
                .then(({ data: episodesData }) => {
                    if (episodesData.length) {
                        out.lastEp = episodesData[episodesData.length - 1]
                        out.lastEp.type = 'episode'
                    }
                })
        )
    }
    proms[0].then(() => {
        if (out.firstEp) {
            return calculatePlayheadProgress({ profile, episodesData: [out.firstEp] })
        }
    })
    proms[1].then(() => {
        if (out.lastEp) {
            return calculatePlayheadProgress({ profile, episodesData: [out.lastEp] })
        }
    })
    return Promise.all(proms).then(() => out)
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
 * @param {Object} obj.Object
 * @param {Number} obj.rating
 * @param {Function} obj.updateRating
 * @param {Function} obj.setIndex
 * @param {Function} obj.setContentToPlay
 */
const Options = ({ profile, content, rating, updateRating, setIndex, setContentToPlay, ...rest }) => {

    /** @type {[{options: Object, contentList: Array<Object>, type: string}, Function]} */
    const [homeBackup, setHomeBackup] = useRecoilState(homeBackupState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)
    /** @type {[Object, Function]} */
    const [nextContent, setNextConent] = useState(null)
    /** @type {[Object, Function]} */
    const [lastContent, setLastConent] = useState(null)
    /** @type {[Object, Function]} */
    const [isInWatchlist, setIsInWatchlist] = useState(false)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {TitleObj} */
    const { watch, watchLast, description, subtitle, moreDetail } = useMemo(() => {
        return computeTitles({ content, nextContent, lastContent })
    }, [content, nextContent, lastContent])
    /** @type {Function} */
    const moreEpisodes = useChangeActivity(setIndex, 1)
    /** @type {Function} */
    const changeSubs = useChangeActivity(setIndex, 2)
    /** @type {Function} */
    const playNextContent = useCallback(() => {
        setContentToPlay(nextContent)
    }, [setContentToPlay, nextContent])
    /** @type {Function} */
    const playLastContent = useCallback(() => {
        setContentToPlay(lastContent)
    }, [setContentToPlay, lastContent])

    /** @type {Function} */
    const toggleWatchlist = useCallback(() => {
        if (isInWatchlist) {
            api.content.deleteWatchlistItem(profile, { contentId: content.id })
        } else {
            api.content.addWatchlistItem(profile, { contentId: content.id })
        }
        if (homeBackup && homeBackup.type === 'watchlist' && homeBackup.contentList) {
            if (isInWatchlist) {
                const removedIndex = homeBackup.contentList.findIndex(c => c.id === content.id)
                if (removedIndex >= 0) {
                    const newList = homeBackup.contentList.filter(c => c.id !== content.id)
                    setHomeBackup({
                        ...homeBackup,
                        contentList: newList.length ? newList : null
                    })
                    setHomePosition({ rowIndex: Math.max(0, removedIndex - 1) })
                }
            } else {
                setHomeBackup({
                    ...homeBackup,
                    contentList: [content, ...(homeBackup.contentList || [])]
                })
                setHomePosition({ rowIndex: 0 })
            }
        }
        setIsInWatchlist(prev => !prev)
    }, [profile, content, isInWatchlist, setIsInWatchlist, homeBackup, setHomeBackup,
        setHomePosition])


    useEffect(() => {
        /** @type {Promise} */
        const nextEpProm = getNextContent(profile, content)
        /** @type {Array<Promise>} */
        const proms = [nextEpProm]
        if (['series', 'movie_listing'].includes(content.type)) {
            proms.push(
                api.content.getWatchlistItems(profile, { contentIds: [content.id] }).then(res => {
                    setIsInWatchlist(res.total > 0)
                })
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
    }, [profile, content, setLoading])

    useEffect(() => {
        let interval = null
        if (!loading) {
            interval = setInterval(() => {
                if (document.querySelector('#play')) {
                    Spotlight.focus('#play')
                    clearInterval(interval)
                }
            }, 100)
        }
        return () => clearInterval(interval)
    }, [loading])

    return (
        <Row {...rest}>
            {loading &&
                <Column align='center center' style={{ height: 'auto', width: '100%' }}>
                    <Spinner />
                </Column>
            }
            {!loading &&
                <Cell size='49%' style={{ maxWidth: '49%', width: '49%' }}>
                    <ContentHeader content={content} />
                    {subtitle &&
                        <Heading size='small' spacing='small' className={css.firstData}>
                            {subtitle}
                        </Heading>
                    }
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
                    <BodyText component='div' size='small' style={{ marginBottom: '1em', marginTop: '1em' }}>
                        {Array.from({ length: 5 }, (_v, i) =>
                            <IconButton size='small' key={i} data-star={i}
                                onClick={updateRating}>
                                {(i < rating) ? 'star' : 'hollowstar'}
                            </IconButton>
                        )}
                    </BodyText>
                    <div className={css.scrollerContainer}>
                        <Scroller direction='vertical' horizontalScrollbar='hidden'
                            verticalScrollbar='visible'>
                            {nextContent &&
                                <Item id='play' onClick={playNextContent}>
                                    <Icon>play</Icon>
                                    <span>{watch}</span>
                                </Item>
                            }
                            {lastContent &&
                                <Item id='play' onClick={playLastContent}>
                                    <Icon>play</Icon>
                                    <span>{watchLast}</span>
                                </Item>
                            }
                            <Item onClick={moreEpisodes}>
                                <Icon>series</Icon>
                                <span>{moreDetail}</span>
                            </Item>
                            <Item onClick={changeSubs}>
                                <Icon>audio</Icon>
                                <span>{$L('Audio and Subtitles')}</span>
                            </Item>
                            {['series', 'movie_listing'].includes(content.type) && (
                                <Item onClick={toggleWatchlist}>
                                    <Icon>{isInWatchlist ? 'closex' : 'plus'}</Icon>
                                    <span>{isInWatchlist ? $L('Remove from my list') : $L('Add to my list')}</span>
                                </Item>
                            )}
                        </Scroller>
                    </div>
                </Cell>
            }
        </Row>
    )
}

Options.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
    rating: PropTypes.number.isRequired,
    updateRating: PropTypes.func.isRequired,
    setIndex: PropTypes.func.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
}

export default Options
