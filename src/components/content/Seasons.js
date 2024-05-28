
import { useState, useEffect, useCallback } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

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
 */
const Seasons = ({ profile, series, setContentToPlay, isPremium, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState([])
    /** @type {[Object, Function]} */
    const [season, setSeason] = useState({})
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState([])
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    /** @type {Function} */
    const selectSeason = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setSeason(seasons[parseInt(target.dataset.index)])
    }, [seasons, setSeason])

    const playEpisode = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setContentToPlay(episodes[parseInt(target.dataset.index)])
    }, [episodes, setContentToPlay])

    useEffect(() => {
        setLoading(true)
        api.cms.getSeasons(profile, { serieId: series.id }).then(({ data }) => {
            data.forEach(e => { e.episodes = [] })
            setSeason(data[0])
            setSeasons(data)
        }).then(() => setLoading(false))
    }, [profile, series, setSeason])

    useEffect(() => {
        const loadData = async () => {
            if (season.episodes.length) {
                setEpisodes(season.episodes)
            } else {
                const { data: episodesData } = await api.cms.getEpisodes(profile, { seasonId: season.id })
                const prom = calculatePlayheadProgress({ profile, episodesData })
                episodesData.forEach(ep => {
                    ep.type = 'episode'
                    ep.showPremium = !isPremium && getIsPremium(ep)
                })
                season.episodes = episodesData
                await prom
                setEpisodes(episodesData)
            }
        }
        let timeout = null
        if (season.id) {
            setEpisodes([])
            timeout = setTimeout(loadData, 1000)
        }
        return () => clearTimeout(timeout)
    }, [profile, season, isPremium])

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
                                <SeasonsList seasons={seasons} selectSeason={selectSeason} />
                            </Cell>
                        </Column>
                    </Cell>
                    <Cell size="49%">
                        {episodes.length ?
                            <EpisodesList episodes={episodes} selectEpisode={playEpisode} />
                            :
                            <Column align='center center' style={{ height: '100%', width: '100%' }}>
                                <Spinner />
                            </Column>
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
}

export default Seasons
