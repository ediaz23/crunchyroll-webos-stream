
import { useState, useEffect, useCallback, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import LabeledIconButton from '@enact/moonstone/LabeledIconButton'
import Spinner from '@enact/moonstone/Spinner'

import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import { ContentHeader } from '../home/ContentBanner'
import SeasonsList from './SeasonsList'
import EpisodesList from './EpisodesList'

import api from '../../api'
import { getIsPremium } from '../../utils'


/**
 * Caculate playhead progress
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<Object>} obj.episodesData
 */
export async function calculatePlayheadProgress({ profile, episodesData }) {
    const epIds = episodesData.map(e => e.id)
    const { data: data2 } = await api.content.getPlayHeads(profile, { contentIds: epIds })
    const playheads = data2.reduce((total, value) => {
        total[value.content_id] = value
        return total
    }, {})
    for (const ep of episodesData) {
        if (playheads[ep.id]) {
            const duration = ep.duration_ms / 1000
            const playhead = playheads[ep.id].fully_watched ? duration : playheads[ep.id].playhead
            ep.playhead = {
                ...playheads[ep.id],
                progress: playhead / duration * 100
            }
        } else {
            ep.playhead = {
                playhead: 0,
                fully_watched: false,
                progress: 0,
            }
        }
    }
}


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.series
 * @param {Function} obj.setContentToPlay
 * @param {Boolean} obj.isPremium account is premium?
 * @param {Object} obj.contentDetailBak
 */
const Seasons = ({ profile, series, setContentToPlay, isPremium, contentDetailBak, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState(contentDetailBak.seasons
        ? JSON.parse(JSON.stringify(contentDetailBak.seasons))  // to avoid error setting episodes, line 132
        : null
    )
    /** @type {[Number, Function]} */
    const [seasonIndex, setSeasonIndex] = useState(contentDetailBak.seasonIndex)
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState(null)
    /** @type {[Number, Function]} */
    const [episodeIndex, setEpisodeIndex] = useState(null)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)
    /** @type {{current: Number}} */
    const seasonIndexRef = useRef(null)

    /** @type {Function} */
    const playEpisode = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (episodes && episodes.length) {
            seasons.forEach(e => { e.episodes = [] })  // force reload
            setContentToPlay(episodes[index], { seasons, seasonIndex })
        }
    }, [seasons, seasonIndex, episodes, setContentToPlay])

    /** @type {Function} */
    const markAsWatched = useCallback(ev => {
        if (ev.type === 'click' || (ev.type === 'keyup' && ev.key === 'Enter')) {
            if (episodes && episodes.filter(ep => !(ep?.playhead?.fully_watched)).length > 0) {
                setLoading(true)
                for (const ep of episodes) {
                    if (!ep.playhead) {
                        ep.playhead = {}
                    }
                    ep.playhead.fully_watched = true
                    ep.playhead.progress = 100
                }
                setEpisodes([...episodes])
                api.discover.markAsWatched(profile, seasons[seasonIndex].id)
                    .then(() => console.log('watched'))
                    .catch(console.error)
                    .finally(() => setLoading(false))
            }
        }
    }, [profile, seasons, seasonIndex, episodes, setLoading])

    useBackVideoIndex(episodes, setEpisodeIndex)

    useEffect(() => {
        if (contentDetailBak.seasons == null) {
            api.cms.getSeasons(profile, { serieId: series.id }).then(({ data }) => {
                data.forEach(e => { e.episodes = [] })
                setSeasons(data)
                setSeasonIndex(0)
            })
        }
    }, [profile, series, contentDetailBak.seasons])

    useEffect(() => {
        seasonIndexRef.current = seasonIndex
        setEpisodes(null)
        setEpisodeIndex(null)
        if (seasonIndex != null && seasons != null) {
            if (seasons[seasonIndex].episodes.length) {
                if (seasonIndex === seasonIndexRef.current) {
                    setEpisodes(seasons[seasonIndex].episodes)
                }
            } else {
                api.cms.getEpisodes(profile, { seasonId: seasons[seasonIndex].id }).then(async ({ data }) => {
                    data.forEach(ep => {
                        ep.type = 'episode'
                        ep.showPremium = !isPremium && getIsPremium(ep)
                    })

                    seasons[seasonIndex].episodes = data

                    if (data.length) {
                        await calculatePlayheadProgress({ profile, episodesData: data })
                    }

                    if (seasonIndex === seasonIndexRef.current) {
                        setEpisodes(data)
                    }
                })
            }
        }
    }, [profile, seasons, seasonIndex, isPremium])

    return (
        <Row align='start space-between' {...rest}>
            <Row style={{ width: '100%' }}>
                <Cell size='49%'>
                    <Column>
                        <Cell shrink>
                            <ContentHeader content={series} />
                        </Cell>
                        <Cell grow>
                            <SeasonsList
                                seasons={seasons}
                                selectSeason={setSeasonIndex}
                                seasonIndex={seasonIndex} />
                        </Cell>
                    </Column>
                </Cell>
                <Cell size='49%'>
                    <Column>
                        {series.type === 'series' && seasons != null && seasons.length > 0 && (
                            <Cell shrink>
                                <Heading size="small">
                                    {seasons[seasonIndex].season_tags.join(', ')}
                                </Heading>
                                {loading && <Spinner />}
                                {!loading &&
                                    <LabeledIconButton
                                        icon='checkselection'
                                        labelPosition='after'
                                        onClick={markAsWatched}
                                        onKeyUp={markAsWatched}
                                        style={{ maxWidth: '13rem' }}
                                        disabled={!(episodes &&
                                            episodes.filter(ep => !(ep?.playhead?.fully_watched)).length > 0)
                                        }>
                                        {$L('Mark as watched')}
                                    </LabeledIconButton>
                                }
                            </Cell>
                        )}
                        <Cell grow>
                            <EpisodesList
                                seasonIndex={seasonIndex}
                                episodes={episodes}
                                selectEpisode={playEpisode}
                                episodeIndex={episodeIndex} />
                        </Cell>
                    </Column>
                </Cell>
            </Row>
        </Row>
    )
}

Seasons.propTypes = {
    profile: PropTypes.object.isRequired,
    series: PropTypes.object.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
    isPremium: PropTypes.bool.isRequired,
    contentDetailBak: PropTypes.object.isRequired,
}

export default Seasons
