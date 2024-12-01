
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
 * @param {Object} obj.playContent
 * @param {Function} obj.setContentToPlay
 * @param {Boolean} obj.isPremium account is premium?
 * @param {Object} obj.contentDetailBak
 */
const Seasons = ({ profile, series, playContent, setContentToPlay, isPremium, contentDetailBak, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState(JSON.parse(JSON.stringify(contentDetailBak.seasons || [])))
    /** @type {[Number, Function]} */
    const [seasonIndex, setSeasonIndex] = useState(contentDetailBak.seasonIndex)
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState(null)
    /** @type {[Number, Function]} */
    const [episodeIndex, setEpisodeIndex] = useState(null)
    /** @type {{current: Number}} */
    const seasonIndexRef = useRef(null)
    /** @type {{current: Object}} */
    const playContentRef = useRef(playContent)

    /** @type {Function} */
    const playEpisode = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (episodes && episodes.length) {
            seasons.forEach(e => { e.episodes = [] })  // force reload
            setContentToPlay(episodes[index], { seasons, seasonIndex })
        }
    }, [seasons, seasonIndex, episodes, setContentToPlay])

    useEffect(() => {
        if (episodes != null && episodes.length) {
            if (playContentRef.current != null) {
                const index = episodes.findIndex(ep => ep.id === playContentRef.current.id)
                setEpisodeIndex(Math.max(0, index))
                playContentRef.current = null
            } else {
                setEpisodeIndex(0)
            }
        }
    }, [episodes])

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
        if (seasonIndex != null && seasons.length) {
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
                                selectSeason={setSeasonIndex}
                                seasonIndex={seasonIndex} />
                        </Cell>
                    </Column>
                </Cell>
                <Cell size="49%">
                    <EpisodesList
                        seasonIndex={seasonIndex}
                        episodes={episodes}
                        selectEpisode={playEpisode}
                        episodeIndex={episodeIndex} />
                </Cell>
            </Row>
        </Row>
    )
}

Seasons.propTypes = {
    profile: PropTypes.object.isRequired,
    series: PropTypes.object.isRequired,
    playContent: PropTypes.object,
    setContentToPlay: PropTypes.func.isRequired,
    isPremium: PropTypes.bool.isRequired,
    contentDetailBak: PropTypes.object.isRequired,
}

export default Seasons
