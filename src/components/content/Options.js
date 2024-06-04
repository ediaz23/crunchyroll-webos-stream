
import { useEffect, useCallback, useState, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Spotlight from '@enact/spotlight'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import Scroller from '../../patch/Scroller'
import { calculatePlayheadProgress } from './Seasons'
import { ContentHeader } from '../home/ContentBanner'
import api from '../../api'
import back from '../../back'
import css from './ContentDetail.module.less'


const useChangeActivity = (setIndex, index) => {
    return () => {
        back.pushHistory({ doBack: () => { setIndex(0) } })
        setIndex(index)
    }
}

/**
 * Compute titles
 * @param {{
    content: Object,
    nextContent: Object,
 }}
 * @returns {{watch: String, description: String, subtitle: String, moreDetail: String}}
 */
const computeTitles = ({ content, nextContent }) => {
    let subtitle = '', description = content.description || '', watch = $L('Watch')
    let moreDetail = ''

    if (nextContent) {
        if (nextContent.type === 'episode') {
            let season = 1, episodeNumber = 1
            if (nextContent.episode_metadata) {
                season = nextContent.episode_metadata.season_number
                episodeNumber = nextContent.episode_metadata.episode_number
            } else {
                season = nextContent.season_number
                episodeNumber = nextContent.episode_number
            }
            if (episodeNumber !== null && episodeNumber !== undefined) {
                watch = `${$L('Watch')} ${$L('Season')} ${season}: ${$L('E')} ${episodeNumber}`
                subtitle = `${$L('Episode')} ${episodeNumber}: ${nextContent.title || ''}`
            } else {
                watch = `${$L('Watch')} ${$L('Season')} ${season}: ${nextContent.title || ''}`
                subtitle = nextContent.title || ''
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
    return { watch, description, subtitle, moreDetail }
}

/**
 * get next episode
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
export const getNextEpidose = async (profile, content) => {
    const { data: seasonsData } = await api.cms.getSeasons(profile, { serieId: content.id })
    const { data: episodesData } = await api.cms.getEpisodes(profile, { seasonId: seasonsData[0].id })
    const tmpEpisode = episodesData[0]
    tmpEpisode.type = 'episode'
    return tmpEpisode
}

/**
 * get next movie
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
export const getNextMovie = async (profile, content) => {
    const { data: moviesData } = await api.cms.getMovies(profile, { movieListingId: content.id })
    const tmpMovie = moviesData[0]
    tmpMovie.type = 'movie'
    return { ...tmpMovie, ...(tmpMovie.panel || {}), panel: null }
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
        getNextProm.then(async tmpEpisode => {
            if (tmpEpisode) {
                await calculatePlayheadProgress({ profile, episodesData: [tmpEpisode] })
            }
            return tmpEpisode
        })
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

    /** @type {[Object, Function]} */
    const [nextContent, setNextConent] = useState(null)
    /** @type {[Object, Function]} */
    const [isInWatchlist, setIsInWatchlist] = useState(false)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {{watch: String, description: String, subtitle: String, moreDetail: String}} */
    const { watch, description, subtitle, moreDetail } = useMemo(() => {
        return computeTitles({ content, nextContent })
    }, [content, nextContent])
    /** @type {Function} */
    const moreEpisodes = useChangeActivity(setIndex, 1)
    /** @type {Function} */
    const changeSubs = useChangeActivity(setIndex, 2)
    /** @type {Function} */
    const playNextContent = useCallback(() => {
        setContentToPlay(nextContent)
    }, [setContentToPlay, nextContent])

    /** @type {Function} */
    const toggleWatchlist = useCallback(() => {
        if (isInWatchlist) {
            api.content.deleteWatchlistItem(profile, { contentId: content.id })
        } else {
            api.content.addWatchlistItem(profile, { contentId: content.id })
        }
        setIsInWatchlist(prev => !prev)
    }, [profile, content, isInWatchlist, setIsInWatchlist])


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
        nextEpProm.then(setNextConent)
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
                <Cell size='49%'>
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
