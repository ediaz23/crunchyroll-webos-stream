
import { useState, useEffect, useCallback } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import PropTypes from 'prop-types'

import { ContentHeader } from '../home/ContentBanner'
import SeasonsList from './SeasonsList'
import EpisodesList from './EpisodesList'

import api from '../../api'
import { $L } from '../../hooks/language'
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
            ep.playhead = {
                ...playheads[ep.id],
                progress: playheads[ep.id].playhead / duration * 100
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
 * @param {Function} obj.onSelectSeason
 */
const Seasons = ({ profile, series, setContentToPlay, isPremium, contentDetailBak, onSelectSeason, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState(JSON.parse(JSON.stringify(contentDetailBak.seasons || [])))
    /** @type {[Number, Function]} */
    const [seasonIndex, setSeasonIndex] = useState(contentDetailBak.seasonIndex || 0)
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState(contentDetailBak.episodes || null)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    /** @type {Function} */
    const selectSeason = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setSeasonIndex(parseInt(target.dataset.index))
    }, [setSeasonIndex])

    /** @type {Function} */
    const playEpisode = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const episodeIndex = parseInt(target.dataset.index)
        if (episodes) {
            setContentToPlay(episodes[episodeIndex], {
                seasons,
                seasonIndex,
                episodes,
                episodeIndex,

            })
        }
    }, [seasons, seasonIndex, episodes, setContentToPlay])

    useEffect(() => {
        if (contentDetailBak.seasonIndex != null &&
            contentDetailBak.seasonIndex !== seasonIndex) {
            // reset bak values
            onSelectSeason({
                episodes: undefined,
                episodeIndex: undefined,
            })
        }
    }, [profile, seasonIndex, contentDetailBak.seasonIndex, onSelectSeason])

    useEffect(() => {
        if (contentDetailBak.seasons == null) {
            setLoading(true)
            api.cms.getSeasons(profile, { serieId: series.id }).then(({ data }) => {
                data.forEach(e => { e.episodes = [] })
                setSeasons(data)
            }).then(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [profile, series, contentDetailBak.seasons])

    useEffect(() => {
        const loadData = () => {
            if (seasons[seasonIndex].episodes.length) {
                setEpisodes(seasons[seasonIndex].episodes)
            } else {
                api.cms.getEpisodes(profile, { seasonId: seasons[seasonIndex].id })
                    .then(({ data }) => Promise.all([
                        Promise.resolve().then(() => {
                            data.forEach(ep => {
                                ep.type = 'episode'
                                ep.showPremium = !isPremium && getIsPremium(ep)
                            })
                            seasons[seasonIndex].episodes = data
                        }),
                        Promise.resolve().then(() => {
                            if (data.length) {
                                return calculatePlayheadProgress({ profile, episodesData: data })
                            }
                        }),
                    ]).then(() => setEpisodes(data)))
            }
        }
        let timeout = null
        if (seasons.length && contentDetailBak.episodes == null) {
            setEpisodes(null)
            timeout = setTimeout(loadData, 256)
        }
        return () => clearTimeout(timeout)
    }, [profile, seasons, seasonIndex, isPremium, contentDetailBak.episodes])

    return (
        <Row align='start space-between' {...rest}>
            {loading &&
                <Column align='center center' style={{ width: '100%' }}>
                    <Spinner />
                </Column>
            }
            {!loading &&
                <Row style={{ width: '100%' }}>
                    <Cell size="49%">
                        <Column>
                            <Cell shrink>
                                <ContentHeader content={series} />
                            </Cell>
                            <Cell>
                                <SeasonsList
                                    seasons={seasons}
                                    selectSeason={selectSeason}
                                    seasonIndex={seasonIndex} />
                            </Cell>
                        </Column>
                    </Cell>
                    <Cell size="49%">
                        {!episodes &&
                            <Column align='center center' style={{ height: '100%', width: '100%' }}>
                                <Spinner />
                            </Column>
                        }
                        {episodes && episodes.length === 0 &&
                            <Column align='center center' style={{ height: '100%', width: '100%' }}>
                                <h1>{$L('Empty')}</h1>
                            </Column>
                        }
                        {episodes && episodes.length > 0 &&
                            <EpisodesList
                                episodes={episodes}
                                selectEpisode={playEpisode}
                                episodeIndex={contentDetailBak.episodeIndex} />
                        }
                    </Cell>
                </Row>
            }
        </Row>
    )
}

Seasons.propTypes = {
    profile: PropTypes.object.isRequired,
    series: PropTypes.object.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
    isPremium: PropTypes.bool.isRequired,
    contentDetailBak: PropTypes.object.isRequired,
    onSelectSeason: PropTypes.func.isRequired,
}

export default Seasons
