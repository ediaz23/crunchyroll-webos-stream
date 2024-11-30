
import { useState, useEffect, useCallback, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

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
    const [seasonIndex, setSeasonIndex] = useState(contentDetailBak.seasonIndex)
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState(null)
    /** @type {{current: Number}} */
    const seasonIndexRef = useRef(null)

    /** @type {Function} */
    const playEpisode = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const episodeIndex = parseInt(target.dataset.index)
        if (episodes) {
            seasons.forEach(e => { e.episodes = [] })  // force reload
            setContentToPlay(episodes[episodeIndex], {
                seasons,
                seasonIndex,
                episodeIndex,
            })
        }
    }, [seasons, seasonIndex, episodes, setContentToPlay])

    const setSeason = useCallback(index => {
        // reset bak values
        onSelectSeason({ episodeIndex: undefined })
        setSeasonIndex(index)
    }, [onSelectSeason])

    useEffect(() => {
        if (contentDetailBak.seasons == null) {
            api.cms.getSeasons(profile, { serieId: series.id }).then(({ data }) => {
                data.forEach(e => { e.episodes = [] })
                setSeasons(data)
            })
        }
    }, [profile, series, contentDetailBak.seasons])

    useEffect(() => {
        seasonIndexRef.current = seasonIndex
        const loadData = () => {
            if (seasons[seasonIndex].episodes.length) {
                if (seasonIndex === seasonIndexRef.current) {
                    setEpisodes(seasons[seasonIndex].episodes)
                }
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
                    ]).then(() => seasonIndex === seasonIndexRef.current && setEpisodes(data)))
            }
        }
        let timeout = null
        if (seasons.length) {
            setEpisodes(null)
            if (seasonIndex != null) {
                timeout = setTimeout(loadData, 256)
            }
        }
        return () => clearTimeout(timeout)
    }, [profile, seasons, seasonIndex, isPremium])

    return (
        <Row align='start space-between' {...rest}>
            <Row style={{ width: '100%' }}>
                <Cell size="49%">
                    <Column>
                        <Cell shrink>
                            <ContentHeader content={series} />
                        </Cell>
                        <Cell>
                            <SeasonsList
                                seasons={seasons}
                                selectSeason={setSeason}
                                seasonIndex={seasonIndex} />
                        </Cell>
                    </Column>
                </Cell>
                <Cell size="49%">
                    <EpisodesList
                        seasonIndex={seasonIndex}
                        episodes={episodes}
                        selectEpisode={playEpisode}
                        episodeIndex={contentDetailBak.episodeIndex} />
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
    onSelectSeason: PropTypes.func.isRequired,
}

export default Seasons
